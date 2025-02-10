class CustomCalendar {
  constructor(input, options = {}) {
    this.input = input;
    this.options = {
      onSelect: options.onSelect || (() => {}),
      initialDate: options.initialDate || new Date()
    };

    this.currentDate = new Date(this.options.initialDate);
    this.selectedDate = null;
    this.isVisible = false;

    this.createCalendarUI();
    this.attachEventListeners();
  }

  createCalendarUI() {
    this.calendar = document.createElement('div');
    this.calendar.className = 'custom-calendar';
    this.calendar.style.display = 'none';

    // カレンダーのHTML構造を作成
    this.calendar.innerHTML = `
      <div class="calendar-header">
        <button class="prev-month">◀</button>
        <div class="date-selectors">
          <select class="year-select"></select>
          <select class="month-select">
            <option value="0">1月</option>
            <option value="1">2月</option>
            <option value="2">3月</option>
            <option value="3">4月</option>
            <option value="4">5月</option>
            <option value="5">6月</option>
            <option value="6">7月</option>
            <option value="7">8月</option>
            <option value="8">9月</option>
            <option value="9">10月</option>
            <option value="10">11月</option>
            <option value="11">12月</option>
          </select>
        </div>
        <button class="next-month">▶</button>
      </div>
      <div class="calendar-grid">
        <div class="weekdays">
          <div>日</div><div>月</div><div>火</div><div>水</div><div>木</div><div>金</div><div>土</div>
        </div>
        <div class="days"></div>
      </div>
      <div class="calendar-footer">
        <button class="calendar-apply">決定</button>
      </div>
    `;

    document.body.appendChild(this.calendar);
    this.updateCalendar();
  }

  updateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    // 年の選択肢を更新
    const yearSelect = this.calendar.querySelector('.year-select');
    if (!yearSelect.options.length) {
      // 2007年から現在の年まで
      const startYear = 2007;
      const currentYear = new Date().getFullYear();
      for (let y = startYear; y <= currentYear; y++) {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y + '年';
        yearSelect.appendChild(option);
      }
    }
    
    // 現在の年月を選択
    yearSelect.value = year;
    this.calendar.querySelector('.month-select').value = month;

    // 日付グリッドを生成
    const daysGrid = this.calendar.querySelector('.days');
    daysGrid.innerHTML = '';

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();

    // 前月の日付を追加
    for (let i = 0; i < startPadding; i++) {
      const prevMonthLastDay = new Date(year, month, 0);
      const day = prevMonthLastDay.getDate() - startPadding + i + 1;
      const dayDiv = document.createElement('div');
      dayDiv.className = 'day inactive';
      dayDiv.textContent = day;
      daysGrid.appendChild(dayDiv);
    }

    // 当月の日付を追加
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const dayDiv = document.createElement('div');
      dayDiv.className = 'day';
      
      // 土日の色分け
      const dayOfWeek = new Date(year, month, i).getDay();
      if (dayOfWeek === 0) dayDiv.classList.add('sunday');
      if (dayOfWeek === 6) dayDiv.classList.add('saturday');
      
      // 今日の日付をハイライト
      const today = new Date();
      if (year === today.getFullYear() && 
          month === today.getMonth() && 
          i === today.getDate()) {
        dayDiv.classList.add('today');
      }
      
      dayDiv.textContent = i;

      const currentDate = new Date(year, month, i);
      if (this.selectedDate && 
          currentDate.toDateString() === this.selectedDate.toDateString()) {
        dayDiv.classList.add('selected');
      }

      dayDiv.addEventListener('click', () => this.selectDate(new Date(year, month, i)));
      
      // ツールチップで曜日を表示
      const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
      const weekday = weekdays[new Date(year, month, i).getDay()];
      dayDiv.title = `${month + 1}月${i}日(${weekday})`;

      daysGrid.appendChild(dayDiv);
    }

    // 次月の日付を追加（最終行を埋める）
    const totalDays = startPadding + lastDay.getDate();
    const endPadding = Math.ceil(totalDays / 7) * 7 - totalDays;
    for (let i = 1; i <= endPadding; i++) {
      const dayDiv = document.createElement('div');
      dayDiv.className = 'day inactive';
      dayDiv.textContent = i;
      daysGrid.appendChild(dayDiv);
    }
  }

  selectDate(date) {
    this.selectedDate = date;
    
    // 入力フィールドを更新
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    this.input.value = `${year}-${month}-${day}`;
    
    // フィルターを適用
    this.options.onSelect(date);
    
    this.updateCalendar();
  }

  attachEventListeners() {
    // 年月の選択イベント
    this.calendar.querySelector('.year-select').addEventListener('change', (e) => {
      const year = parseInt(e.target.value);
      const month = this.currentDate.getMonth();
      
      // currentDateを更新
      this.currentDate = new Date(year, month, 1);
      
      // 月の1日を選択
      const firstDay = new Date(year, month, 1);
      this.selectDate(firstDay);
    });

    this.calendar.querySelector('.month-select').addEventListener('change', (e) => {
      const year = this.currentDate.getFullYear();
      const month = parseInt(e.target.value);
      
      // currentDateを更新
      this.currentDate = new Date(year, month, 1);
      
      // 選択された月の1日を選択
      const firstDay = new Date(year, month, 1);
      this.selectDate(firstDay);
    });

    // 入力フィールドのクリックでカレンダーを表示
    this.input.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showCalendar();
    });

    // 前月/次月ボタン
    this.calendar.querySelector('.prev-month').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.updateCalendar();
    });

    this.calendar.querySelector('.next-month').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.updateCalendar();
    });

    // 決定ボタン
    this.calendar.querySelector('.calendar-apply').addEventListener('click', () => {
      if (this.selectedDate) {
        const year = this.selectedDate.getFullYear();
        const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(this.selectedDate.getDate()).padStart(2, '0');
        this.input.value = `${year}-${month}-${day}`;
        this.options.onSelect(this.selectedDate);
      }
      this.hideCalendar();
    });

    // カレンダー外クリックで閉じる
    document.addEventListener('click', (e) => {
      // カレンダー、入力フィールド、日付セル以外をクリックした時のみ閉じる
      const isDateCell = e.target.classList.contains('day');
      const isCalendarElement = this.calendar.contains(e.target);
      const isInputElement = e.target === this.input;
      
      if (!isCalendarElement && !isInputElement && !isDateCell) {
        this.hideCalendar();
      }
    });

    // キーボード操作
    document.addEventListener('keydown', (e) => {
      if (!this.isVisible) return;
      
      switch(e.key) {
        case 'Escape':
          this.hideCalendar();
          break;
        case 'Enter':
          if (this.selectedDate) {
            this.hideCalendar();
            this.options.onSelect(this.selectedDate);
          }
          break;
        case 'ArrowLeft':
          if (this.selectedDate) {
            const newDate = new Date(this.selectedDate);
            newDate.setDate(newDate.getDate() - 1);
            this.selectDate(newDate);
          }
          break;
        case 'ArrowRight':
          if (this.selectedDate) {
            const newDate = new Date(this.selectedDate);
            newDate.setDate(newDate.getDate() + 1);
            this.selectDate(newDate);
          }
          break;
      }
    });
  }

  showCalendar() {
    const rect = this.input.getBoundingClientRect();
    this.calendar.style.display = 'block';
    this.calendar.style.top = `${rect.bottom + window.scrollY}px`;
    this.calendar.style.left = `${rect.left + window.scrollX}px`;
    this.isVisible = true;
  }

  hideCalendar() {
    this.calendar.style.display = 'none';
    this.isVisible = false;
  }
} 