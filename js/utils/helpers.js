const Utils = {
  shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  formatPercentage(value, total) {
    if (total === 0) return '0%';
    return Math.round((value / total) * 100) + '%';
  },

  debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  getRandomItems(array, count) {
    const shuffled = this.shuffle(array);
    return shuffled.slice(0, count);
  },

  highlightDifferences(word1, word2) {
    const maxLen = Math.max(word1.length, word2.length);
    const diff = [];
    
    for (let i = 0; i < maxLen; i++) {
      const char1 = word1[i] || '';
      const char2 = word2[i] || '';
      
      if (char1 !== char2) {
        diff.push({
          index: i,
          char1,
          char2
        });
      }
    }
    
    return diff;
  },

  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes === 0) {
      return `${seconds}秒`;
    }
    return `${minutes}分${remainingSeconds}秒`;
  },

  vibrate(pattern = [50]) {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }
};

window.Utils = Utils;
