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
      result[`${videoId}_${type}_active`]
    );

    if (hasRating) {
      // 評価済みの表示を追加
      const ratedBadge = document.createElement('div');
      ratedBadge.className = 'rated-badge';
      ratedBadge.textContent = '評価済み';
      // まずバッジを追加
      buttonsContainer.appendChild(ratedBadge);
    }
    // その後でボタングループを追加
    buttonsContainer.appendChild(buttonsGroup);
  });

  // ボタンをbodyに直接追加
  document.body.appendChild(buttonsContainer);

  // タイトル、再生数、投稿日時、タグを取得して保存
  const saveVideoInfo = () => {
    const titleElement = document.querySelector("[aria-label=nicovideo-content] h1");
    const viewCountElement = document.querySelector("[aria-label=nicovideo-content] h1 + div > time + div > svg + span");
    const dateElement = Array.from(document.querySelectorAll('time[datetime]'))
      .find(el => el.closest('dd')?.previousElementSibling?.textContent.includes('投稿日時'));
    const tagArea = document.querySelector("[data-anchor-area=tags]");
    const thumbnailElement = document.querySelector('link[rel="preload"][as="image"]');
    
    const userLink = location.href; // hrefを取得
    const userName = document.querySelector('[data-anchor-area="video_detail"] a')?.textContent.trim() || '不明';

    if (titleElement && viewCountElement && dateElement && tagArea && thumbnailElement && userElement) {
      const videoTitle = titleElement.textContent.trim();
      const viewCount = viewCountElement.textContent.trim();
      const uploadDate = dateElement.textContent.trim();
      const tags = Array.from(tagArea.parentElement.parentElement.querySelectorAll("a"))
        .map(it => it.textContent)
        .filter(it => !!it)
        .join(', ');
      const thumbnail = thumbnailElement.href;

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
      setTimeout(saveVideoInfo, 1500);
    }
  };

  // 情報保存を実行
  saveVideoInfo();
}

function createButton(text, className, videoId) {
  const button = document.createElement('button');
  button.className = `like-button ${className}`;
  button.textContent = text;
  button.addEventListener('click', async () => {
    try {
      // 現在の最大ナンバリングを取得
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(null, resolve);
      });

      // 既存のナンバリングの最大値を取得
      const existingNumbers = Object.entries(result)
        .filter(([key]) => key.endsWith('_number'))
        .map(([, value]) => parseInt(value))
        .filter(num => !isNaN(num));

      // 最大値を取得（存在しない場合は0）
      const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
      
      // 新規ナンバリングを割り当て
      const newNumber = maxNumber + 1;

      // 新しい評価を保存（ナンバリングも含める）
      await new Promise(resolve => {
        chrome.storage.local.set({
          [`${videoId}_${className}_active`]: true,
          [`${videoId}_number`]: newNumber,
          [`${videoId}_addedAt`]: new Date().toISOString()
        }, () => {
          // 評価更新を通知
          chrome.runtime.sendMessage({ type: 'ratingUpdated' });
          resolve();
        });
      });

      // 動画情報を再取得して保存
      const saveVideoInfo = () => {
        const titleElement = document.querySelector("[aria-label=nicovideo-content] h1");
        const viewCountElement = Array.from(document.querySelectorAll('span'))
        .find(el => el.closest('dd')?.previousElementSibling?.textContent.includes('再生'));
        const dateElement = Array.from(document.querySelectorAll('time[datetime]'))
          .find(el => el.closest('dd')?.previousElementSibling?.textContent.includes('投稿日時'));
        const tagArea = document.querySelector("[data-anchor-area=tags]");
        const thumbnailElement = document.querySelector('link[rel="preload"][as="image"]');
        const userElement = document.querySelector('[data-anchor-area="video_information"]:nth-child(2)');

        if (titleElement && viewCountElement && dateElement && tagArea && thumbnailElement && userElement) {
          const videoTitle = titleElement.textContent.trim();
          const viewCount = viewCountElement.textContent.trim();
          const uploadDate = dateElement.textContent.trim();
          const tags = Array.from(tagArea.parentElement.parentElement.querySelectorAll("a"))
            .map(it => it.textContent)
            .filter(it => !!it)
            .join(', ');
          const thumbnail = thumbnailElement.href;
          
          // ユーザー名を取得
          let userName = userElement.textContent.trim();

          chrome.storage.local.set({
            [`${videoId}_title`]: videoTitle,
            [`${videoId}_views`]: viewCount,
            [`${videoId}_date`]: uploadDate,
            [`${videoId}_tags`]: tags,
            [`${videoId}_thumbnail`]: thumbnail,
            [`${videoId}_user`]: userName
          });
        }
      };

      // 情報を更新
      saveVideoInfo();

      // ボタンの状態を更新
      document.querySelectorAll('.like-button').forEach(btn => {
        btn.classList.remove('active');
      });
      button.classList.add('active');

      // 評価済みバッジがまだない場合は追加
      if (!document.querySelector('.rated-badge')) {
        const ratedBadge = document.createElement('div');
        ratedBadge.className = 'rated-badge';
        ratedBadge.textContent = '評価済み';
        const buttonsContainer = document.querySelector('.like-buttons');
        const buttonsGroup = document.querySelector('.buttons-group');
        buttonsContainer.insertBefore(ratedBadge, buttonsGroup);
      }

      // 評価完了通知を表示
      const notification = document.createElement('div');
      notification.className = 'rating-notification';
      notification.textContent = '評価しました';
      document.body.appendChild(notification);

      // アニメーション終了後に要素を削除
      setTimeout(() => {
        notification.remove();
      }, 1500);

    } catch (error) {
      alert('評価に失敗しました。ページをリロードして再度評価してください。');
      console.error('評価エラー:', error);
    }
  });

  // 現在の状態を確認
  chrome.storage.local.get(`${videoId}_${className}_active`, (result) => {
    if (result[`${videoId}_${className}_active`]) {
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