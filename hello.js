// ストレージから評価データを取得して表示
chrome.storage.local.get(null, (result) => {
  console.log(result);
  const videoData = {};
  let currentSort = {
    column: result.savedSortColumn || null,
    direction: result.savedSortDirection || 'asc'
  };

  // バックアップデータを保持する変数
  let lastBackup = null;

  // 評価変更の履歴を保持する配列
  let undoHistory = [];

  // 削除されたNo.をストレージから読み込む
  let deletedNumbers = result.deletedNumbers || [];

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
      
      // 削除されたNo.を復元
      if (lastAction.deletedNumbers) {
        deletedNumbers = deletedNumbers.filter(n => 
          !lastAction.deletedNumbers.includes(n)
        );
        // 更新されたdeletedNumbersをストレージに保存
        await new Promise(resolve => {
          chrome.storage.local.set({ deletedNumbers }, resolve);
        });
      }
      
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
        // 既存のナンバリングの最大値を取得
        const existingNumbers = Object.entries(result)
          .filter(([key]) => key.endsWith('_number'))
          .map(([, value]) => parseInt(value))
          .filter(num => !isNaN(num));  // 有効な数値のみ

        // 最大値を取得（存在しない場合は0）
        const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
        
        // 新規追加の場合は必ず最大値+1を割り当て
        const newNumber = maxNumber + 1;
        
        videoData[videoId] = { 
          like: false, 
          'super-like': false,
          title: result[`${videoId}_title`] || videoId,
          views: result[`${videoId}_views`] || '不明',
          date: result[`${videoId}_date`] || '不明',
          tags: result[`${videoId}_tags`] || '不明',
          thumbnail: result[`${videoId}_thumbnail`] || 'https://placehold.jp/24/cccccc/ffffff/320x180.png?text=No_Image',
          user: result[`${videoId}_user`] || '不明',
          addedAt: result[`${videoId}_addedAt`] || new Date().toISOString(),
          number: result[`${videoId}_number`] || newNumber
        };

        // 新規追加時は必ずナンバリングを保存
        if (!result[`${videoId}_number`]) {
          chrome.storage.local.set({
            [`${videoId}_number`]: newNumber,
            [`${videoId}_addedAt`]: videoData[videoId].addedAt
          });
        }
      }
      if (value) {
        videoData[videoId][type] = true;
        // 追加日時のみ未設定の場合は設定
        if (!result[`${videoId}_addedAt`]) {
          chrome.storage.local.set({
            [`${videoId}_addedAt`]: new Date().toISOString()
          });
        }
      }
    }
  });

  // 動画情報を表示する関数
  function displayVideos(sortedData) {
    const videoList = document.getElementById('videoList');
    videoList.innerHTML = '';

    sortedData.forEach(([videoId, data], index) => {
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
      row.setAttribute('data-video-id', videoId);
      
      // 行のクリックイベントを追加
      row.addEventListener('click', (e) => {
        // リンクやボタンのクリックは無視
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') {
          return;
        }
        
        row.classList.toggle('selected');
      });

      // No.セルを作成
      const numberCell = document.createElement('div');
      numberCell.className = 'cell number';
      
      const numberText = document.createElement('div');
      numberText.className = 'number-text';
      numberText.textContent = data.number || '-';  // 保存されたNo.を表示
      
      const dateText = document.createElement('div');
      dateText.className = 'date-text';
      const addedDate = new Date(data.addedAt);
      // 日付と時刻を表示（YYYY/MM/DD HH:mm:ss形式）
      const year = addedDate.getFullYear();
      const month = String(addedDate.getMonth() + 1).padStart(2, '0');
      const day = String(addedDate.getDate()).padStart(2, '0');
      const hours = String(addedDate.getHours()).padStart(2, '0');
      const minutes = String(addedDate.getMinutes()).padStart(2, '0');
      const seconds = String(addedDate.getSeconds()).padStart(2, '0');
      dateText.textContent = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
      
      numberCell.appendChild(numberText);
      numberCell.appendChild(dateText);

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
      if (data['super-like']) {
        ratingDisplay.textContent = '大好き';
        ratingDisplay.className += ' rating-superlike';
      } else if (data.like) {
        ratingDisplay.textContent = '好き';
        ratingDisplay.className += ' rating-like';
      } else if (data.hold) {
        ratingDisplay.textContent = '保留';
        ratingDisplay.className += ' rating-hold';
      }

      // プルダウンメニュー
      const ratingMenu = document.createElement('div');
      ratingMenu.className = 'rating-menu';
      
      const menuItems = [
        { text: '大好き', class: 'super-like', type: 'super-like' },
        { text: '好き', class: 'like', type: 'like' },
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

            // データを更新
            if (item.class === 'super-like') {
              data['super-like'] = true;
              data.like = false;
              data.hold = false;
            } else if (item.class === 'like') {
              data['super-like'] = false;
              data.like = true;
              data.hold = false;
            } else if (item.class === 'hold') {
              data['super-like'] = false;
              data.like = false;
              data.hold = true;
            }
            
            // No.が未設定の場合は新しい番号を割り当て
            if (!data.number) {
              // 現在の最大No.を取得
              const numbers = Object.values(videoData)
                .map(v => v.number)
                .filter(n => n !== null)
                .map(n => parseInt(n));
              // 最初の動画の場合は1、それ以外は最大値+1
              const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
              data.number = numbers.length === 0 ? 1 : maxNumber + 1;
              
              // ストレージにも保存
              chrome.storage.local.set({
                [`${videoId}_number`]: data.number
              });
            }
            
            // videoDataオブジェクトを更新
            videoData[videoId] = data;

            // 評価変更を通知して全タブを更新
            chrome.runtime.sendMessage({ type: 'ratingUpdated' }, () => {
              // 現在のタブの表示を更新
              if (currentSort.column) {
                const sortedVideos = sortData(Object.entries(videoData), currentSort.column);
                displayVideos(sortedVideos);
              } else {
                displayVideos(Object.entries(videoData));
              }
            });
          }

          // 元に戻すボタンを表示（既存のボタンを使用）
          undoButton.style.display = 'block';
        });

        ratingMenu.appendChild(menuItem);
      });

      ratingCell.appendChild(ratingDisplay);
      ratingCell.appendChild(ratingMenu);

      row.appendChild(numberCell);
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
  function sortData(data, column) {
    return data.sort(([, a], [, b]) => {
      let comparison = 0;
      
      switch (column) {
        case 'No.':
          const numberA = parseInt(a.number) || Infinity;
          const numberB = parseInt(b.number) || Infinity;
          comparison = numberA - numberB;
          break;
        case 'タイトル':
          comparison = a.title.localeCompare(b.title);
          break;
        case '投稿者':
          comparison = a.user.localeCompare(b.user);
          break;
        case '再生数':
          // カンマを除去して数値に変換
          const viewsA = parseInt(a.views.replace(/[,万]/g, ''));
          const viewsB = parseInt(b.views.replace(/[,万]/g, ''));

          // "万"が含まれている場合は10000を掛ける
          const finalViewsA = a.views.includes('万') ? viewsA * 10000 : viewsA;
          const finalViewsB = b.views.includes('万') ? viewsB * 10000 : viewsB;

          comparison = finalViewsA - finalViewsB;
          break;
        case '投稿日時':
          const dateA = new Date(a.date.replace(/\//g, '-'));
          const dateB = new Date(b.date.replace(/\//g, '-'));
          comparison = dateA - dateB;
          break;
        case '評価':
          // 評価の優先順位を設定
          const ratingOrder = {
            'none': 0,       // 評価なし
            'hold': 1,      // 保留
            'like': 2,      // 好き
            'super-like': 3  // 大好き
          };
          // 各動画の評価値を取得
          function getRatingValue(data) {
            if (data['super-like']) return 'super-like';  // 大好き
            if (data.like) return 'like';                 // 好き
            if (data.hold) return 'hold';                 // 保留
            return 'none';                                // 評価なし
          }

          const ratingA = getRatingValue(a);
          const ratingB = getRatingValue(b);
          comparison = ratingOrder[ratingA] - ratingOrder[ratingB];
          break;
      }
      
      return currentSort.direction === 'asc' ? comparison : -comparison;
    });
  }

  // ヘッダーにクリックイベントを追加
  document.querySelectorAll('.header-cell').forEach((header, index) => {
    const columns = ['No.', 'サムネ', 'タイトル', '投稿者', '再生数', '投稿日時', 'タグ', '評価'];
    const column = columns[index];

    // no-sortクラスを持つヘッダーはスキップ
    if (header.classList.contains('no-sort')) {
      return;
    }

    // 初期ソート状態を復元
    if (column === currentSort.column) {
      header.classList.add(`sort-${currentSort.direction}`);
      const titleText = currentSort.direction === 'asc' ? 
        '昇順でソート中（クリックで降順に変更）' : 
        '降順でソート中（クリックで昇順に変更）';
      header.title = titleText;
    }

    header.addEventListener('click', () => {
      // ソート方向を決定
      const direction = currentSort.column === column && currentSort.direction === 'asc' ? 'desc' : 'asc';
      
      // ヘッダーのソートインジケータを更新
      document.querySelectorAll('.header-cell').forEach(h => {
        h.classList.remove('sort-asc', 'sort-desc');
        h.title = '';  // 以前のtitleをクリア
      });
      header.classList.add(`sort-${direction}`);
      
      // ソート状態を示すtitleを設定
      const titleText = direction === 'asc' ? 
        '昇順でソート中（クリックで降順に変更）' : 
        '降順でソート中（クリックで昇順に変更）';
      header.title = titleText;

      // ソートして表示を更新
      currentSort = { column, direction };
      // ソート状態表示を更新
      updateSortStatus();
      // ソート状態を保存
      chrome.storage.local.set({
        savedSortColumn: column,
        savedSortDirection: direction
      });
      const sortedVideos = sortData(Object.entries(videoData), column);
      displayVideos(sortedVideos);
    });
  });

  // 全削除ボタンのイベントリスナー
  document.getElementById('deleteAll').addEventListener('click', () => {
    if (confirm('すべての評価を削除しますか？')) {
      // 現在のデータをバックアップ
      chrome.storage.local.get(null, (data) => {
        // 削除する項目数をカウント
        const itemCount = Object.keys(data)
          .filter(key => key.includes('_active') && data[key] === true)
          .length;
        
        lastBackup = data;
        
        // 現在のNo.をdeletedNumbersに追加
        const currentNumbers = Object.entries(data)
          .filter(([key]) => key.endsWith('_number'))
          .map(([, value]) => value);
        
        deletedNumbers.push(...currentNumbers);
        
        // データを削除（deletedNumbersは維持）
        const keysToRemove = Object.keys(data).filter(key => key !== 'deletedNumbers');
        chrome.storage.local.remove(keysToRemove, () => {
          // deletedNumbersを保存
          chrome.storage.local.set({ deletedNumbers }, () => {
            // 一覧をクリア
            const videoList = document.getElementById('videoList');
            videoList.innerHTML = '';
            
            // 元に戻すボタンを表示
            // 既存の元に戻すボタンを削除
            const existingRestoreButton = document.querySelector('.restore-button');
            if (existingRestoreButton) {
              existingRestoreButton.remove();
            }
            
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

            // 削除完了のダイアログを表示
            alert(`${itemCount}件の評価を削除しました`);
          });
        });
      });
    }
  });

  // 選択項目の削除ボタンのイベントリスナー
  const deleteSelectedButton = document.getElementById('deleteSelected');
  
  // 選択状態の変更を監視して削除ボタンの状態を更新
  const observer = new MutationObserver(() => {
    const selectedRows = document.querySelectorAll('.row.selected');
    deleteSelectedButton.disabled = selectedRows.length === 0;
  });
  
  observer.observe(document.getElementById('videoList'), {
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
  
  deleteSelectedButton.addEventListener('click', async () => {
    const selectedRows = document.querySelectorAll('.row.selected');
    if (selectedRows.length === 0) return;

    if (confirm(`選択された${selectedRows.length}件の評価を削除しますか？`)) {
      const currentState = await new Promise(resolve => {
        chrome.storage.local.get(null, resolve);
      });

      // 選択された項目のデータを収集
      const keysToRemove = [];
      const numbersToDelete = [];  // 変数名を変更
      selectedRows.forEach(row => {
        const videoId = row.getAttribute('data-video-id');
        Object.keys(currentState).forEach(key => {
          if (key.startsWith(videoId)) {
            keysToRemove.push(key);
            if (key === `${videoId}_number`) {
              numbersToDelete.push(parseInt(currentState[key]));
            }
          }
        });
      });

      // 削除されるナンバリングより大きい番号を持つ項目のナンバリングを-1する
      const updates = {};
      Object.entries(currentState)
        .filter(([key]) => key.endsWith('_number'))
        .forEach(([key, value]) => {
          const currentNumber = parseInt(value);
          const decrementCount = numbersToDelete.filter(num => num < currentNumber).length;
          if (decrementCount > 0) {
            updates[key] = currentNumber - decrementCount;
          }
        });

      // ナンバリングの更新を保存
      if (Object.keys(updates).length > 0) {
        await new Promise(resolve => {
          chrome.storage.local.set(updates, resolve);
        });
      }

      // 削除されたNo.を保存（修正）
      deletedNumbers.push(...numbersToDelete);  // 新しい削除番号を追加
      await new Promise(resolve => {
        chrome.storage.local.set({ deletedNumbers }, resolve);
      });

      // 履歴に保存
      const relevantState = keysToRemove.reduce((obj, key) => {
        obj[key] = currentState[key];
        return obj;
      }, {});
      undoHistory.push({ 
        state: relevantState,
        deletedNumbers: numbersToDelete
      });

      // 選択された項目を削除
      await new Promise(resolve => {
        chrome.storage.local.remove(keysToRemove, resolve);
      });

      // 選択された行を削除
      selectedRows.forEach(row => row.remove());

      // 元に戻すボタンを表示
      undoButton.style.display = 'block';

      // 削除完了のダイアログを表示
      alert(`${selectedRows.length}件の評価を削除しました`);
      
      // ページをリロードして更新されたナンバリングを反映
      location.reload();
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
        { value: '0', label: '50未満', threshold: 50 },
        { value: '1', label: '100未満', threshold: 100 },
        { value: '2', label: '500未満', threshold: 500 },
        { value: '3', label: '1000未満', threshold: 1000 },
        { value: '4', label: '3000未満', threshold: 3000 },
        { value: '5', label: '5000未満', threshold: 5000 },
        { value: '6', label: '1万未満', threshold: 10000 },
        { value: '7', label: '5万未満', threshold: 50000 },
        { value: '8', label: '10万未満', threshold: 100000 },
        { value: '9', label: '25万未満', threshold: 250000 },
        { value: '10', label: '50万未満', threshold: 500000 },
        { value: '11', label: '100万未満', threshold: 1000000 },
        { value: '12', label: 'すべて', threshold: Infinity }
      ];

      const selectedRange = viewsRanges[parseInt(viewsFilterValue)];
      document.getElementById('viewsLabel').textContent = selectedRange.label;

      if (viewsFilterValue !== '12') {
        const viewsText = viewsCell.textContent.replace(/[,万]/g, '');
        const views = parseInt(viewsText);
        const actualViews = viewsText.includes('万') ? views * 10000 : views;
        matchesViews = !isNaN(actualViews) && actualViews < selectedRange.threshold;
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
      // データを再読み込み
      chrome.storage.local.get(null, (result) => {
        // videoDataを更新
        Object.entries(result).forEach(([key, value]) => {
          if (key.includes('_active')) {
            const [videoId, type] = key.replace('_active', '').split('_');
            if (!videoData[videoId]) {
              // 既存のナンバリングの最大値を取得
              const existingNumbers = Object.entries(result)
                .filter(([key]) => key.endsWith('_number'))
                .map(([, value]) => parseInt(value))
                .filter(num => !isNaN(num));  // 有効な数値のみ

              // 最大値を取得（存在しない場合は0）
              const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
              
              // 新規追加の場合は必ず最大値+1を割り当て
              const newNumber = maxNumber + 1;
              
              videoData[videoId] = { 
                like: false, 
                'super-like': false,
                title: result[`${videoId}_title`] || videoId,
                views: result[`${videoId}_views`] || '不明',
                date: result[`${videoId}_date`] || '不明',
                tags: result[`${videoId}_tags`] || '不明',
                thumbnail: result[`${videoId}_thumbnail`] || 'https://placehold.jp/24/cccccc/ffffff/320x180.png?text=No_Image',
                user: result[`${videoId}_user`] || '不明',
                addedAt: result[`${videoId}_addedAt`] || new Date().toISOString(),
                number: result[`${videoId}_number`] || newNumber
              };

              // 新規追加時は必ずナンバリングを保存
              if (!result[`${videoId}_number`]) {
                chrome.storage.local.set({
                  [`${videoId}_number`]: newNumber,
                  [`${videoId}_addedAt`]: videoData[videoId].addedAt
                });
              }
            }
            if (value) {
              videoData[videoId][type] = true;
            }
          }
        });

        // ソート状態を維持したまま再表示
        if (currentSort.column) {
          const sortedVideos = sortData(Object.entries(videoData), currentSort.column);
          displayVideos(sortedVideos);
        } else {
          displayVideos(Object.entries(videoData));
        }
      });
    }
  });

  // データを表示してからフィルターを適用
  if (currentSort.column) {
    const sortedVideos = sortData(Object.entries(videoData), currentSort.column);
    displayVideos(sortedVideos);
  } else {
    // 初期表示時はソートなしで表示
    displayVideos(Object.entries(videoData));
  }

  // ソート状態表示を更新する関数
  function updateSortStatus() {
    const sortStatus = document.getElementById('sortStatus');
    const clearSortButton = document.getElementById('clearSort');
    
    if (currentSort.column) {
      const direction = currentSort.direction === 'asc' ? '昇順' : '降順';
      sortStatus.textContent = `${currentSort.column}で${direction}ソート中`;
      clearSortButton.style.display = 'block';
    } else {
      sortStatus.textContent = '';
      clearSortButton.style.display = 'none';
    }
  }

  // ソート解除ボタンのイベントリスナー
  document.getElementById('clearSort').addEventListener('click', () => {
    // ヘッダーのソートインジケータをクリア
    document.querySelectorAll('.header-cell').forEach(h => {
      h.classList.remove('sort-asc', 'sort-desc');
      h.title = '';
    });
    
    // ソート状態をクリア
    currentSort = { column: null, direction: 'asc' };
    updateSortStatus();
    
    // ストレージからソート状態を削除
    chrome.storage.local.remove(['savedSortColumn', 'savedSortDirection']);
    
    // データを元の順序で表示
    displayVideos(Object.entries(videoData));
  });

  // 初期表示時にソート状態を更新
  updateSortStatus();

  console.log(result);

}); 
