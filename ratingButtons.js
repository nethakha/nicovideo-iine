import { saveVideoInfo } from './videoInfo.js';

// 評価ボタンを作成する関数
export const createButton = (text, className, videoId) => {
  const button = document.createElement('button');
  button.className = `like-button ${className}`;
  button.textContent = text;

  button.addEventListener('click', async () => {
    try {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(null, resolve);
      });

      const existingNumbers = Object.entries(result)
        .filter(([key]) => key.endsWith('_number'))
        .map(([, value]) => parseInt(value))
        .filter(num => !isNaN(num));

      const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
      const newNumber = maxNumber + 1;

      await new Promise(resolve => {
        chrome.storage.local.set({
          [`${videoId}_${className}_active`]: true,
          [`${videoId}_number`]: newNumber,
          [`${videoId}_addedAt`]: new Date().toISOString()
        }, () => {
          chrome.runtime.sendMessage({ type: 'ratingUpdated' });
          resolve();
        });
      });

      saveVideoInfo(videoId);
      
      // ボタンの状態を更新
      document.querySelectorAll('.like-button').forEach(btn => {
        btn.classList.remove('active');
      });
      button.classList.add('active');

      // 評価済みバッジの追加
      if (!document.querySelector('.rated-badge')) {
        const ratedBadge = document.createElement('div');
        ratedBadge.className = 'rated-badge';
        ratedBadge.textContent = '評価済み';
        const buttonsContainer = document.querySelector('.like-buttons');
        const buttonsGroup = document.querySelector('.buttons-group');
        buttonsContainer.insertBefore(ratedBadge, buttonsGroup);
      }

    } catch (error) {
      console.error('評価エラー:', error);
      alert('評価に失敗しました。ページをリロードして再度評価してください。');
    }
  });

  return button;
}; 