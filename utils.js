// 共通の関数をまとめる
export const NumberingUtils = {
  // ナンバリング関連の処理
  getMaxNumber: async () => {
    const result = await chrome.storage.local.get(null);
    const existingNumbers = Object.entries(result)
      .filter(([key]) => key.endsWith('_number'))
      .map(([, value]) => parseInt(value))
      .filter(num => !isNaN(num));
    return existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
  },
  
  // その他の共通処理
}; 