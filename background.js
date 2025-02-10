chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: 'hello.html'
  });
});

// content.jsからのメッセージを受け取る
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openList') {
    chrome.tabs.create({
      url: 'hello.html'
    });
  }
});

// メッセージリスナーを設定
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_THUMBNAIL') {
    fetchThumbnailUrl(request.videoId)
      .then(url => sendResponse({ url }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // 非同期レスポンスのために必要
  }
}); 