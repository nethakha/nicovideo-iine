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

  // 各ボタンをコンテナに追加
  ratingButtons.forEach(button => buttonsContainer.appendChild(button));
  buttonsContainer.appendChild(listButton);

  // ボタンをbodyに直接追加
  document.body.appendChild(buttonsContainer);

  // タイトル、再生数、投稿日時、タグを取得して保存
  const saveVideoInfo = () => {
    const titleElement = document.querySelector("[aria-label=nicovideo-content] h1");
    const viewCountElement = document.querySelector("[aria-label=nicovideo-content] h1 + div > time + div > svg + span");
    const dateElement = document.querySelector("[aria-label=nicovideo-content] h1 + div > time");
    const tagArea = document.querySelector("[data-anchor-area=tags]");
    const thumbnailElement = document.querySelector('link[rel="preload"][as="image"]');

    if (titleElement && viewCountElement && dateElement && tagArea && thumbnailElement) {
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
        [`${videoId}_thumbnail`]: thumbnail
      });
    } else {
      setTimeout(saveVideoInfo, 1000);
    }
  };

  // 情報保存を実行
  saveVideoInfo();
}

function createButton(text, className, videoId) {
  const button = document.createElement('button');
  button.className = `like-button ${className}`;
  button.innerHTML = `${text}`;

  const key = videoId + '_' + className;
  
  // ストレージから現在の状態を取得して表示
  chrome.storage.local.get(null, (result) => {
    // 他のボタンのアクティブ状態を確認
    const isAnyOtherActive = ['hold', 'like', 'super-like'].some(type => 
      type !== className && result[`${videoId}_${type}_active`]
    );

    const isActive = result[key + '_active'] || false;
    if (isActive) {
      button.classList.add('active');
    }
  });

  button.addEventListener('click', () => {
    chrome.storage.local.get(null, (result) => {
      const isCurrentlyActive = result[key + '_active'] || false;
      
      // 現在のボタンの状態を反転
      const newActive = !isCurrentlyActive;

      // 全ての評価ボタンを非アクティブにする
      const updates = {};
      ['hold', 'like', 'super-like'].forEach(type => {
        const otherKey = `${videoId}_${type}`;
        updates[otherKey + '_active'] = false;
      });

      // クリックされたボタンの状態を設定
      updates[key + '_active'] = newActive;

      // 変更を保存
      chrome.storage.local.set(updates, () => {
        // 全ての評価ボタンからactiveクラスを削除
        document.querySelectorAll('.like-button.hold, .like-button.like, .like-button.super-like')
          .forEach(btn => btn.classList.remove('active'));

        // クリックされたボタンのactiveクラスを設定
        if (newActive) {
          button.classList.add('active');
        }
      });
    });
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