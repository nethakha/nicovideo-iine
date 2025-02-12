function createLikeButtons() {
  // すでにボタンが存在する場合は追加しない
  if (document.querySelector('.like-buttons')) {
    return;
  }

  // ボタンを配置する要素を作成
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'like-buttons';

  // 動画IDを取得
  const videoId = window.location.pathname.split('/')[2];

  // 評価ボタンを作成
  const holdButton = createButton('保留', 'hold', videoId);
  const likeButton = createButton('好き', 'like', videoId);
  const superLikeButton = createButton('大好き', 'super-like', videoId);

  // 評価ボタンの配列
  const ratingButtons = [holdButton, likeButton, superLikeButton];

  // 「評価一覧」ボタンを作成
  const listButton = document.createElement('button');
  listButton.className = 'like-button list';
  listButton.textContent = '評価一覧';
  listButton.addEventListener('click', () => {
    window.open(chrome.runtime.getURL('hello.html'), '_blank');
  });

  // 評価ボタンと評価一覧ボタンのコンテナを作成
  const buttonsGroup = document.createElement('div');
  buttonsGroup.className = 'buttons-group';

  // 評価ボタンを追加
  ratingButtons.forEach(button => buttonsGroup.appendChild(button));
  
  // 評価一覧ボタンを追加
  buttonsGroup.appendChild(listButton);

  // 評価済みかどうかを確認してからボタングループを追加
  chrome.storage.local.get(null, (result) => {
    const hasRating = ['hold', 'like', 'super-like'].some(type => 
      result[`${videoId}_evaluation`] === type
    );

    if (hasRating) {
      // 評価済みの表示を追加
      const ratedBadge = document.createElement('div');
      ratedBadge.className = 'rated-badge';
      ratedBadge.textContent = '評価済み';
      buttonsContainer.appendChild(ratedBadge);
    }
    buttonsContainer.appendChild(buttonsGroup);
  });

  // ボタンをbodyに直接追加
  document.body.appendChild(buttonsContainer);

  // 情報保存を実行
  saveVideoInfo(videoId);
}

function saveVideoInfo(videoId) {
  const titleElement = document.querySelector("[aria-label=nicovideo-content] h1");
  const viewCountElement = document.querySelector("[aria-label=nicovideo-content] h1 + div > time + div > svg + span");
  const dateElement = Array.from(document.querySelectorAll('time[datetime]'))
    .find(el => el.closest('dd')?.previousElementSibling?.textContent.includes('投稿日時'));
  const tagArea = document.querySelector("[data-anchor-area=tags]");
  const thumbnailElement = document.querySelector('link[rel="preload"][as="image"]');

  // 二番目のvideo_detail要素を取得
  const userElements = document.querySelectorAll('[data-anchor-area="video_detail"]');
  const userElement = userElements[1]; // 二番目の要素を取得
  const userLink = userElement ? userElement.getAttribute('href') : '#'; // hrefを取得

  // ユーザー名を取得
  const userName = userElement ? userElement.querySelector('div > img')?.getAttribute('alt') || '不明' : '不明';

  if (titleElement && viewCountElement && dateElement && tagArea && thumbnailElement) {
    const videoTitle = titleElement.textContent.trim();
    const viewCount = viewCountElement.textContent.trim();
    const uploadDate = dateElement.textContent.trim();
    const tags = Array.from(tagArea.parentElement.parentElement.querySelectorAll("a"))
      .map(it => it.textContent)
      .filter(it => !!it)
      .join(', ');
    const thumbnail = thumbnailElement.href;

    // localStorageに保存
    chrome.storage.local.set({
      [`${videoId}_title`]: videoTitle,
      [`${videoId}_views`]: viewCount,
      [`${videoId}_date`]: uploadDate,
      [`${videoId}_tags`]: tags,
      [`${videoId}_thumbnail`]: thumbnail,
      [`${videoId}_user`]: userName,
      [`${videoId}_userLink`]: userLink // userLinkを保存
    });
  } else {
    console.error('必要な要素が見つかりませんでした。'); // エラーメッセージを追加
    setTimeout(() => saveVideoInfo(videoId), 1500); // videoIdを渡す
  }
}

function createButton(text, className, videoId) {
  const button = document.createElement('button');
  button.className = `like-button ${className}`;
  button.textContent = text;

  button.addEventListener('click', async () => {
    try {
      // 既存の評価を取得
      const result = await new Promise(resolve => {
        chrome.storage.local.get(null, resolve);
      });

      // 新しい評価を保存
      const isNewRating = !result[`${videoId}_evaluation`]; // 新規評価かどうかを判定
      await new Promise(resolve => {
        chrome.storage.local.set({
          [`${videoId}_evaluation`]: className, // 評価の保存形式を変更
          [`${videoId}_addedAt`]: new Date().toISOString()
        }, () => {
          // 評価更新を通知
          chrome.runtime.sendMessage({ action: 'updateRating', videoId, type: className });
          resolve();
        });
      });

      // 動画情報を再取得して保存
      saveVideoInfo(videoId); // videoIdを渡す

      // 評価済みバッジを追加（まだ存在しない場合）
      const buttonsContainer = document.querySelector('.like-buttons');
      if (buttonsContainer && !buttonsContainer.querySelector('.rated-badge')) {
        const ratedBadge = document.createElement('div');
        ratedBadge.className = 'rated-badge';
        ratedBadge.textContent = '評価済み';
        buttonsContainer.insertBefore(ratedBadge, buttonsContainer.firstChild);
      }

      // ボタンを目立たせる
      button.classList.add('active'); // ボタンにアクティブクラスを追加
      setTimeout(() => {
        button.classList.remove('active'); // 1.5秒後にアクティブクラスを削除
      }, 1500);

      // 評価完了通知を表示
      const notification = document.createElement('div');
      notification.className = 'rating-notification';
      notification.textContent = isNewRating ? '評価しました' : '評価を更新しました'; // 新規評価か更新かでメッセージを変更
      document.body.appendChild(notification);

      // アニメーション終了後に要素を削除
      setTimeout(() => {
        notification.remove();
      }, 1500); // 1.5秒後に通知を消す

    } catch (error) {
      console.error('評価エラー:', error); // エラーの詳細をコンソールに出力
      alert('評価に失敗しました。ページをリロードして再度評価してください。');
    }
  });

  // 現在の状態を確認
  chrome.storage.local.get(`${videoId}_evaluation`, (result) => {
    if (result[`${videoId}_evaluation`] === className) {
      button.classList.add('active');
    }
  });

  return button;
}

// URLの変更を監視する関数
function watchUrlChanges() {
  let lastUrl = location.href;
  
  // URLの変更を定期的にチェック
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // 既存のボタンを削除
      const existingButtons = document.querySelector('.like-buttons');
      if (existingButtons) {
        existingButtons.remove();
      }
      // ボタンを再作成
      createLikeButtons();
    }
  });

  // body要素の変更を監視
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// ページ読み込み完了後にボタンを追加とURL監視を開始
window.addEventListener('load', () => {
  createLikeButtons();
  watchUrlChanges();
}); 