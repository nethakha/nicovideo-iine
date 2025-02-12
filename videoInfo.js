// 動画情報を取得して保存する関数
export const saveVideoInfo = (videoId) => {
  const titleElement = document.querySelector("[aria-label=nicovideo-content] h1");
  const viewCountElement = document.querySelector("[aria-label=nicovideo-content] h1 + div > time + div > svg + span");
  const dateElement = Array.from(document.querySelectorAll('time[datetime]'))
    .find(el => el.closest('dd')?.previousElementSibling?.textContent.includes('投稿日時'));
  const tagArea = document.querySelector("[data-anchor-area=tags]");
  const thumbnailElement = document.querySelector('link[rel="preload"][as="image"]');
  const userElement = document.querySelector("[data-anchor-area=video_information]:nth-child(2)");

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
    let userName = '不明';
    try {
      const userLink = userElement?.querySelector('a');
      if (userLink && userLink.textContent) {
        userName = userLink.textContent.trim();
      }
    } catch (error) {
      console.error('ユーザー名の取得に失敗:', error);
    }

    chrome.storage.local.set({
      [`${videoId}_title`]: videoTitle,
      [`${videoId}_views`]: viewCount,
      [`${videoId}_date`]: uploadDate,
      [`${videoId}_tags`]: tags,
      [`${videoId}_thumbnail`]: thumbnail,
      [`${videoId}_user`]: userName
    });
  } else {
    setTimeout(() => saveVideoInfo(videoId), 1500);
  }
}; 