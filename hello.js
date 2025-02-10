// ストレージから評価データを取得して表示
chrome.storage.local.get(null, (result) => {
  const videoData = {};
  let currentSort = { column: null, direction: 'asc' };

  // バックアップデータを保持する変数
  let lastBackup = null;

  // 評価変更の履歴を保持する配列
  let undoHistory = [];

  // 元に戻すボタンを作成（グローバルに1つだけ）
  const undoButton = document.createElement('button');
  undoButton.className = 'undo-button';
  undoButton.textContent = '元に戻す';
  undoButton.style.display = 'none';
  document.body.appendChild(undoButton);

  // 元に戻すボタンのクリックイベント
  undoButton.addEventListener('click', async () => {
    const lastAction = undoHistory.pop();
    if (lastAction) {
      // 状態を復元
      await new Promise(resolve => {
        chrome.storage.local.set(lastAction.state, resolve);
      });
      
      // 履歴が空になったらボタンを非表示
      if (undoHistory.length === 0) {
        undoButton.style.display = 'none';
      }
      
      // 表示を更新
      location.reload();
    }
  });

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
          thumbnail: result[`${videoId}_thumbnail`] || 'https://placehold.jp/24/cccccc/ffffff/320x180.png?text=No_Image',
          user: result[`${videoId}_user`] || '不明'
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
    videoList.innerHTML = '';

    sortedData.forEach(([videoId, data]) => {
      // 以下の場合はスキップ:
      // 1. 評価が無い
      // 2. タイトルがsm～から始まる
      // 3. 投稿日時が不明
      // 4. 再生数が不明
      if (!data.like && !data['super-like'] && !data.hold ||
          data.title.startsWith('sm') ||
          data.date === '不明' ||
          data.views === '不明') {
        return;
      }

      const row = document.createElement('div');
      row.className = 'row';
      
      const thumbnailCell = document.createElement('div');
      thumbnailCell.className = 'cell thumbnail';
      thumbnailCell.innerHTML = `<img src="${data.thumbnail}" alt="${data.title}" loading="lazy" onerror="this.src='https://placehold.jp/24/cccccc/ffffff/320x180.png?text=No_Image'">`;

      const titleCell = document.createElement('div');
      const userCell = document.createElement('div');
      const viewsCell = document.createElement('div');
      const dateCell = document.createElement('div');
      const tagsCell = document.createElement('div');
      const ratingCell = document.createElement('div');

      // 基本クラスを設定
      titleCell.className = 'cell';
      userCell.className = 'cell user-name';
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

      // ユーザー名のリンクを設定
      const userName = data.user || '不明';
      userCell.innerHTML = `<a href="https://www.nicovideo.jp/user/${encodeURIComponent(userName)}" target="_blank">${userName}</a>`;

      // 評価のセル
      ratingCell.className += ' rating-cell';
      
      // 評価表示用の要素
      const ratingDisplay = document.createElement('div');
      ratingDisplay.className = 'rating-display';
      if (data.like) {
        ratingDisplay.textContent = '好き';
        ratingDisplay.className += ' rating-like';
      } else if (data['super-like']) {
        ratingDisplay.textContent = '大好き';
        ratingDisplay.className += ' rating-superlike';
      } else if (data.hold) {
        ratingDisplay.textContent = '保留';
        ratingDisplay.className += ' rating-hold';
      }

      // プルダウンメニュー
      const ratingMenu = document.createElement('div');
      ratingMenu.className = 'rating-menu';
      
      const menuItems = [
        { text: '好き', class: 'like', type: 'like' },
        { text: '大好き', class: 'super-like', type: 'super-like' },
        { text: '保留', class: 'hold', type: 'hold' },
        { text: '評価を削除', class: 'remove', type: 'remove' }
      ];

      menuItems.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = 'rating-menu-item';
        menuItem.textContent = item.text;
        menuItem.dataset.type = item.type;
        
        menuItem.addEventListener('click', async () => {
          // 現在の評価状態を履歴に保存
          const currentState = await new Promise(resolve => {
            chrome.storage.local.get(null, resolve);
          });
          const relevantState = Object.entries(currentState)
            .filter(([key]) => key.startsWith(videoId))
            .reduce((obj, [key, value]) => {
              obj[key] = value;
              return obj;
            }, {});
          undoHistory.push({ videoId, state: relevantState });

          if (item.class === 'remove') {
            // 評価を削除する場合は、関連するすべての情報を削除
            const keysToRemove = Object.keys(await new Promise(resolve => {
              chrome.storage.local.get(null, resolve);
            })).filter(key => key.startsWith(videoId));
            
            await new Promise(resolve => {
              chrome.storage.local.remove(keysToRemove, resolve);
            });

            // 行を削除
            row.remove();
          } else {
            // 他の評価を削除
            const keysToRemove = ['hold', 'like', 'super-like'].map(type => 
              `${videoId}_${type}_active`
            );
            await new Promise(resolve => {
              chrome.storage.local.remove(keysToRemove, resolve);
            });

            // 新しい評価を保存
            await new Promise(resolve => {
              chrome.storage.local.set({
                [`${videoId}_${item.class}_active`]: true
              }, resolve);
            });

            // 表示を更新
            location.reload();
          }

          // 元に戻すボタンを表示（既存のボタンを使用）
          undoButton.style.display = 'block';
        });

        ratingMenu.appendChild(menuItem);
      });

      ratingCell.appendChild(ratingDisplay);
      ratingCell.appendChild(ratingMenu);

      row.appendChild(thumbnailCell);
      row.appendChild(titleCell);
      row.appendChild(userCell);
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
          document.querySelector('.button-group').appendChild(restoreButton);
        });
      });
    }
  });

  // 検索機能を追加
  const userSearch = document.getElementById('userSearch');
  const tagSearch = document.getElementById('tagSearch');

  function filterVideos() {
    const userSearchTerm = userSearch.value.toLowerCase();
    const tagSearchTerm = tagSearch.value.toLowerCase();
    const viewsFilterValue = document.getElementById('viewsFilter').value;
    const videoList = document.getElementById('videoList');
    const rows = videoList.children;
    
    // 各行を検索条件でフィルタリング
    Array.from(rows).forEach(row => {
      const userCell = row.querySelector('.user-name a');
      const tagsCell = row.querySelector('.video-tags');
      const viewsCell = row.querySelector('.views-count');
      
      // ユーザー名での検索
      const matchesUser = userSearchTerm ? 
        userCell.textContent.toLowerCase().includes(userSearchTerm) : true;

      // タグでの検索
      let matchesTags = true;
      if (tagSearchTerm) {
        const tagElements = tagsCell.querySelectorAll('a');
        const tags = Array.from(tagElements).map(tag => tag.textContent.toLowerCase());
        const searchTerms = tagSearchTerm.split(/\s+/);
        
        matchesTags = searchTerms.every(term => {
          if (term.startsWith('-')) {
            // マイナス検索
            const excludeTag = term.slice(1);
            return !tags.some(tag => tag.includes(excludeTag));
          } else {
            // 通常検索
            return tags.some(tag => tag.includes(term));
          }
        });
      }

      // 再生数でのフィルタリング
      let matchesViews = true;
      const viewsRanges = [
        { value: 0, label: '50未満', threshold: 50 },
        { value: 1, label: '100未満', threshold: 100 },
        { value: 2, label: '500未満', threshold: 500 },
        { value: 3, label: '1000未満', threshold: 1000 },
        { value: 4, label: '3000未満', threshold: 3000 },
        { value: 5, label: '5000未満', threshold: 5000 },
        { value: 6, label: '1万未満', threshold: 10000 },
        { value: 7, label: '5万未満', threshold: 50000 },
        { value: 8, label: '10万未満', threshold: 100000 },
        { value: 9, label: '25万未満', threshold: 250000 },
        { value: 10, label: '50万未満', threshold: 500000 },
        { value: 11, label: '100万未満', threshold: 1000000 },
        { value: 12, label: 'すべて', threshold: Infinity }
      ];
      
      const selectedRange = viewsRanges[parseInt(viewsFilterValue)];
      document.getElementById('viewsLabel').textContent = selectedRange.label;
      
      if (selectedRange.value !== 7) {
        const viewsText = viewsCell.textContent.replace(/,/g, '');
        const views = parseInt(viewsText);
        matchesViews = !isNaN(views) && views < selectedRange.threshold;
      }

      // 表示/非表示を設定
      row.style.display = matchesUser && matchesTags && matchesViews ? '' : 'none';
    });
  }

  // 検索イベントリスナーを設定
  userSearch.addEventListener('input', filterVideos);
  tagSearch.addEventListener('input', filterVideos);
  document.getElementById('viewsFilter').addEventListener('input', filterVideos);

  // 日付フィールドの初期化と処理
  function initializeDateFields() {
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');

    // 保存された日付を復元
    chrome.storage.local.get(['savedStartDate', 'savedEndDate'], (result) => {
      if (result.savedStartDate) {
        startDate.value = result.savedStartDate;
      }
      if (result.savedEndDate) {
        endDate.value = result.savedEndDate;
      } else {
        // 終了日が保存されていない場合は今日の日付を設定
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        endDate.value = `${year}-${month}-${day}`;
      }

      // データを表示してからフィルターを適用
      displayVideos(Object.entries(videoData));
      filterByDate();
    });

    // 日付変更時のフィルター処理
    function filterByDate() {
      const rows = document.querySelectorAll('.row');
      rows.forEach(row => {
        const dateCell = row.querySelector('.upload-date');
        const dateStr = dateCell.textContent;
        const date = new Date(dateStr.replace(/\//g, '-'));
        const start = startDate.value ? new Date(startDate.value) : null;
        const end = endDate.value ? new Date(endDate.value) : null;

        let showRow = true;
        if (start) showRow = showRow && date >= start;
        if (end) {
          const endOfDay = new Date(end);
          endOfDay.setHours(23, 59, 59, 999);
          showRow = showRow && date <= endOfDay;
        }

        row.style.display = showRow ? '' : 'none';
      });

      // 日付を保存
      chrome.storage.local.set({
        savedStartDate: startDate.value,
        savedEndDate: endDate.value
      });
    }

    // イベントリスナーを追加
    startDate.addEventListener('change', filterByDate);
    endDate.addEventListener('change', filterByDate);

    // リセットボタンの処理
    const resetButton = document.getElementById('resetDate');
    resetButton.addEventListener('click', () => {
      // 開始日を2007年3月6日に設定
      startDate.value = '2007-03-06';
      
      // 終了日を今日の日付に設定
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      endDate.value = `${year}-${month}-${day}`;
      
      // フィルターを適用して保存
      filterByDate();
    });

    // カスタムカレンダーを初期化
    const startDateCalendar = new CustomCalendar(startDate, {
      initialDate: new Date('2007-03-06'),
      onSelect: filterByDate
    });

    const endDateCalendar = new CustomCalendar(endDate, {
      initialDate: new Date(),
      onSelect: filterByDate
    });
  }

  // 初期化を実行
  initializeDateFields();

  // 評価更新メッセージを受信したら更新
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'ratingUpdated') {
      // 現在のスクロール位置を保存
      const scrollPosition = window.scrollY;
      
      // ページを再読み込み
      location.reload();

      // スクロール位置を復元
      window.scrollTo(0, scrollPosition);
    }
  });
}); 