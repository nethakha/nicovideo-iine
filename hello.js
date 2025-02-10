// ストレージから評価データを取得して表示
chrome.storage.local.get(null, (result) => {
  const videoData = {};
  let currentSort = { column: null, direction: 'asc' };

  // バックアップデータを保持する変数
  let lastBackup = null;

  // ストレージデータを整理
  Object.entries(result).forEach(([key, value]) => {
    if (key.includes('_active')) {
      const [videoId, type] = key.replace('_active', '').split('_');
      if (!videoData[videoId]) {
        videoData[videoId] = { 
          like: false, 
          'super-like': false,
          title: result[`${videoId}_title`] || videoId,
          views: result[`${videoId}_views`] || '不明',
          date: result[`${videoId}_date`] || '不明',
          tags: result[`${videoId}_tags`] || '不明',
          thumbnail: result[`${videoId}_thumbnail`] || 'https://placehold.jp/24/cccccc/ffffff/320x180.png?text=No_Image'
        };
      }
      if (value) {
        videoData[videoId][type] = true;
      }
    }
  });

  // 動画情報を表示する関数
  function displayVideos(sortedData) {
    const videoList = document.getElementById('videoList');
    videoList.innerHTML = '';  // リストをクリア

    sortedData.forEach(([videoId, data]) => {
      const row = document.createElement('div');
      row.className = 'row';
      
      const thumbnailCell = document.createElement('div');
      thumbnailCell.className = 'cell thumbnail';
      thumbnailCell.innerHTML = `<img src="${data.thumbnail}" alt="${data.title}" loading="lazy" onerror="this.src='https://placehold.jp/24/cccccc/ffffff/320x180.png?text=No_Image'">`;

      const titleCell = document.createElement('div');
      const viewsCell = document.createElement('div');
      const dateCell = document.createElement('div');
      const tagsCell = document.createElement('div');
      const ratingCell = document.createElement('div');

      // 基本クラスを設定
      titleCell.className = 'cell';
      viewsCell.className = 'cell views-count';
      dateCell.className = 'cell upload-date';
      tagsCell.className = 'cell video-tags';
      ratingCell.className = 'cell';

      const url = `https://www.nicovideo.jp/watch/${videoId}`;
      titleCell.innerHTML = `<a href="${url}" target="_blank">${data.title}</a>`;
      titleCell.title = data.title;
      viewsCell.textContent = data.views;
      dateCell.textContent = data.date;
      tagsCell.innerHTML = data.tags
        .split(', ')
        .map(tag => `<span><a href="https://www.nicovideo.jp/tag/${encodeURIComponent(tag)}" target="_blank">${tag}</a></span>`)
        .join('');

      // 評価のセル
      if (data.like) {
        ratingCell.textContent = '好き';
        ratingCell.className += ' rating-like';
      } else if (data['super-like']) {
        ratingCell.textContent = '大好き';
        ratingCell.className += ' rating-superlike';
      } else if (data.hold) {
        ratingCell.textContent = '保留';
        ratingCell.className += ' rating-hold';
      } else {
        ratingCell.textContent = '無評価';
        ratingCell.className += ' rating-none';
      }

      // 削除ボタンを追加
      const deleteButton = document.createElement('button');
      deleteButton.textContent = '削除';
      deleteButton.className = 'delete-button';
      deleteButton.addEventListener('click', () => {
        // ストレージから該当の動画情報を削除
        chrome.storage.local.get(null, (result) => {
          const keysToRemove = Object.keys(result).filter(key => key.startsWith(videoId));
          chrome.storage.local.remove(keysToRemove, () => {
            // 行を削除
            row.remove();
          });
        });
      });
      ratingCell.appendChild(deleteButton);

      row.appendChild(thumbnailCell);
      row.appendChild(titleCell);
      row.appendChild(viewsCell);
      row.appendChild(dateCell);
      row.appendChild(tagsCell);
      row.appendChild(ratingCell);
      videoList.appendChild(row);
    });
  }

  // ソート関数
  function sortVideos(videos, column, direction) {
    return Object.entries(videos).sort((a, b) => {
      const valueA = getSortValue(a[1], column);
      const valueB = getSortValue(b[1], column);
      
      if (direction === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  }

  // ソート用の値を取得
  function getSortValue(data, column) {
    switch(column) {
      case 'title':
        return data.title.toLowerCase();
      case 'views':
        return parseInt(data.views.replace(/[^0-9]/g, '')) || 0;
      case 'date':
        return new Date(data.date);
      case 'tags':
        return data.tags.toLowerCase();
      case 'rating':
        const ratings = { '無評価': 0, '保留': 1, '好き': 2, '大好き': 3 };
        return ratings[data.rating] || 0;
      default:
        return '';
    }
  }

  // ヘッダーにクリックイベントを追加
  document.querySelectorAll('.header-cell').forEach((header, index) => {
    const columns = ['thumbnail', 'title', 'views', 'date', 'tags', 'rating'];
    const column = columns[index];

    header.addEventListener('click', () => {
      // ソート方向を決定
      const direction = currentSort.column === column && currentSort.direction === 'asc' ? 'desc' : 'asc';
      
      // ヘッダーのソートインジケータを更新
      document.querySelectorAll('.header-cell').forEach(h => {
        h.classList.remove('sort-asc', 'sort-desc');
      });
      header.classList.add(`sort-${direction}`);

      // ソートして表示を更新
      currentSort = { column, direction };
      const sortedVideos = sortVideos(videoData, column, direction);
      displayVideos(sortedVideos);
    });
  });

  // 全削除ボタンのイベントリスナー
  document.getElementById('deleteAll').addEventListener('click', () => {
    if (confirm('すべての評価を削除しますか？')) {
      // 現在のデータをバックアップ
      chrome.storage.local.get(null, (data) => {
        lastBackup = data;
        
        // データを削除
        chrome.storage.local.clear(() => {
          // 一覧をクリア
          const videoList = document.getElementById('videoList');
          videoList.innerHTML = '';
          
          // 元に戻すボタンを表示
          const restoreButton = document.createElement('button');
          restoreButton.className = 'restore-button';
          restoreButton.textContent = '元に戻す';
          restoreButton.addEventListener('click', () => {
            if (lastBackup) {
              chrome.storage.local.set(lastBackup, () => {
                // データを再表示
                location.reload();
              });
            }
          });
          
          // 元に戻すボタンを追加
          document.querySelector('.header-container').appendChild(restoreButton);
        });
      });
    }
  });

  // 初期表示
  displayVideos(Object.entries(videoData));
}); 