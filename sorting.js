// ソート関数
export const sortData = (data, column, direction) => {
  return data.sort(([, a], [, b]) => {
    let comparison = 0;
    
    switch (column) {
      case 'No.':
        comparison = (parseInt(a.number) || Infinity) - (parseInt(b.number) || Infinity);
        break;
      case 'タイトル':
        comparison = a.title.localeCompare(b.title);
        break;
      // ... 他のソートケース
    }
    
    return direction === 'asc' ? comparison : -comparison;
  });
}; 