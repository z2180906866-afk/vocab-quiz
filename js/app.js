const { createApp, ref, computed, onMounted } = Vue;

// ============ IndexedDB 简化封装 ============
const DB_NAME = 'VocabQuizDB';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 3);
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      console.log('DB upgrade to version', db.version);
      
      // 删除旧的store如果存在
      if (db.objectStoreNames.contains('wrongAnswers')) {
        db.deleteObjectStore('wrongAnswers');
      }
      if (db.objectStoreNames.contains('batchProgress')) {
        db.deleteObjectStore('batchProgress');
      }
      
      // 创建新的store
      db.createObjectStore('wrongAnswers', { keyPath: 'wordId' });
      db.createObjectStore('batchProgress', { keyPath: 'batchId' });
      console.log('DB stores created');
    };
    
    request.onsuccess = (e) => {
      console.log('DB opened successfully');
      resolve(e.target.result);
    };
    
    request.onerror = (e) => {
      console.error('DB open failed:', e.target.error);
      reject(e.target.error);
    };
  });
}

// 简化的数据库操作
async function saveToStore(storeName, data) {
  const db = await openDB();
  // 关键：将Vue响应式对象转为纯对象，否则IndexedDB无法克隆
  const plain = JSON.parse(JSON.stringify(data));
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(plain);
      
      request.onsuccess = () => {
        console.log('Saved to', storeName, ':', data.wordId || data.batchId);
        resolve(true);
      };
      
      request.onerror = (e) => {
        console.error('Save error:', e.target.error);
        reject(e.target.error);
      };
      
      tx.oncomplete = () => console.log('Transaction completed');
      tx.onerror = (e) => console.error('Transaction error:', e.target.error);
    } catch (err) {
      console.error('Transaction creation failed:', err);
      reject(err);
    }
  });
}

async function getAllFromStore(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        console.log('Got', request.result.length, 'items from', storeName);
        resolve(request.result);
      };
      
      request.onerror = (e) => {
        console.error('GetAll error:', e.target.error);
        reject(e.target.error);
      };
    } catch (err) {
      console.error('GetAll transaction failed:', err);
      reject(err);
    }
  });
}

async function getFromStore(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });
}

async function deleteFromStore(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });
}

async function clearStore(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });
}

// ============ Vue App ============
const app = createApp({
  setup() {
    const phase = ref('select');
    const currentQuestion = ref(null);
    const currentQuestionIndex = ref(0);
    const questions = ref([]);
    const answered = ref(false);
    const selectedIndex = ref(-1);
    const batchResults = ref(null);
    const currentBatchId = ref(null);
    const answers = ref([]);
    const activeTab = ref('core');
    
    // 主页数据
    const stats = ref({ totalAnswered: 0, totalCorrect: 0 });
    const wrongCount = ref(0);
    
    const batches = Array.from({ length: 88 }, (_, i) => i + 1);
    
    const analysisTabs = [
      { id: 'core', label: '核心逻辑' },
      { id: 'similar', label: '避坑预警' },
      { id: 'extended', label: '高分引申' },
      { id: 'exam', label: '真题闭环' }
    ];
    
    const isCorrect = computed(() => {
      if (!currentQuestion.value || selectedIndex.value === -1) return false;
      return selectedIndex.value === currentQuestion.value.question.correctIndex;
    });
    
    const wrongAnswersList = computed(() => {
      if (!batchResults.value || !batchResults.value.answers) return [];
      return batchResults.value.answers.filter(a => !a.isCorrect);
    });
    
    const accuracyDisplay = computed(() => {
      if (!stats.value.totalAnswered) return '0%';
      return Math.round(stats.value.totalCorrect / stats.value.totalAnswered * 100) + '%';
    });
    
    function shuffleArray(array) {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    
    function getBatchClass(batchId) {
      return 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300';
    }
    
    function getOptionClass(index) {
      if (!answered.value) {
        return 'border-gray-200 hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100';
      }
      if (index === currentQuestion.value.question.correctIndex) {
        return 'bg-green-600 text-white border-green-600';
      }
      if (index === selectedIndex.value && !isCorrect.value) {
        return 'bg-red-600 text-white border-red-600 animate-shake';
      }
      return 'border-gray-200 opacity-50';
    }
    
    function formatAccuracy(value) {
      return Math.round(value * 100) + '%';
    }
    
    function getAccuracyClass(accuracy) {
      if (accuracy >= 0.8) return 'text-green-600';
      if (accuracy >= 0.6) return 'text-yellow-600';
      return 'text-red-600';
    }
    
    // ============ 主页数据加载 ============
    async function loadMainPageData() {
      console.log('=== Loading main page data ===');
      
      try {
        // 加载错题
        const wrongWords = await getAllFromStore('wrongAnswers');
        wrongCount.value = wrongWords.length;
        console.log('Wrong answers count:', wrongWords.length);
        
        // 加载统计
        const savedStats = await getFromStore('batchProgress', '__global__');
        console.log('Loaded stats:', savedStats);
        
        if (savedStats) {
          stats.value = {
            totalAnswered: savedStats.totalAnswered || 0,
            totalCorrect: savedStats.totalCorrect || 0
          };
        } else {
          stats.value = { totalAnswered: 0, totalCorrect: 0 };
        }
        
        console.log('Stats:', stats.value);
        console.log('Wrong count:', wrongCount.value);
      } catch (error) {
        console.error('Error loading main page data:', error);
      }
    }
    
    // ============ 答题流程 ============
    async function startBatch(batchId) {
      console.log('Starting batch:', batchId);
      
      try {
        const response = await fetch(`data/processed/batch-${String(batchId).padStart(3, '0')}.json`);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        
        const batchData = await response.json();
        
        phase.value = 'quiz';
        currentBatchId.value = batchId;
        currentQuestionIndex.value = 0;
        questions.value = shuffleArray(batchData.words);
        answers.value = [];
        answered.value = false;
        selectedIndex.value = -1;
        activeTab.value = 'core';
        currentQuestion.value = questions.value[0];
        
        console.log('Quiz started, total questions:', questions.value.length);
      } catch (error) {
        console.error('Error loading batch:', error);
        alert('加载批次数据失败：' + error.message);
      }
    }
    
    async function handleAnswer(index) {
      if (answered.value) return;
      
      answered.value = true;
      selectedIndex.value = index;
      
      const currentQ = questions.value[currentQuestionIndex.value];
      const correct = index === currentQ.question.correctIndex;
      
      // 深拷贝避免Vue响应式对象存入IndexedDB失败
      const plainQ = JSON.parse(JSON.stringify(currentQ));
      
      answers.value.push({
        wordId: plainQ.id,
        word: plainQ.word,
        phonetic: plainQ.phonetic,
        meaning: plainQ.meaning,
        selected: index,
        correct: plainQ.question.correctIndex,
        isCorrect: correct,
        sla: plainQ.sla,
        question: plainQ.question
      });
      
      // 答错自动加入错题本
      if (!correct) {
        try {
          await saveToStore('wrongAnswers', {
            wordId: plainQ.id,
            word: plainQ.word,
            phonetic: plainQ.phonetic,
            meaning: plainQ.meaning,
            sla: plainQ.sla,
            question: plainQ.question,
            addedAt: Date.now()
          });
          console.log('Wrong answer auto-saved:', plainQ.word);
        } catch (e) {
          console.error('Error saving wrong answer:', e);
        }
      }
      
      // 震动反馈
      if (navigator.vibrate) {
        navigator.vibrate(correct ? [50] : [100, 50, 100]);
      }
    }
    
    function nextQuestion() {
      if (currentQuestionIndex.value < questions.value.length - 1) {
        currentQuestionIndex.value++;
        answered.value = false;
        selectedIndex.value = -1;
        activeTab.value = 'core';
        currentQuestion.value = questions.value[currentQuestionIndex.value];
      } else {
        finishBatch();
      }
    }
    
    async function finishBatch() {
      console.log('=== Finishing batch ===');
      
      const correctCount = answers.value.filter(a => a.isCorrect).length;
      const totalQuestions = answers.value.length;
      const accuracy = totalQuestions > 0 ? correctCount / totalQuestions : 0;
      
      console.log('Correct:', correctCount, 'Total:', totalQuestions, 'Accuracy:', accuracy);
      
      // 保存统计到IndexedDB
      try {
        const existingStats = await getFromStore('batchProgress', '__global__');
        console.log('Existing stats:', existingStats);
        
        const newStats = {
          batchId: '__global__',
          totalAnswered: (existingStats?.totalAnswered || 0) + totalQuestions,
          totalCorrect: (existingStats?.totalCorrect || 0) + correctCount
        };
        
        await saveToStore('batchProgress', newStats);
        console.log('Global stats saved:', newStats);
        
        // 更新本地stats
        stats.value = {
          totalAnswered: newStats.totalAnswered,
          totalCorrect: newStats.totalCorrect
        };
        
        // 保存批次进度
        await saveToStore('batchProgress', {
          batchId: String(currentBatchId.value),
          completed: true,
          accuracy: accuracy,
          completedAt: Date.now()
        });
        console.log('Batch progress saved');
        
        // 重新加载错题数
        const wrongWords = await getAllFromStore('wrongAnswers');
        wrongCount.value = wrongWords.length;
        console.log('Updated wrong count:', wrongCount.value);
        
      } catch (e) {
        console.error('Error saving batch results:', e);
      }
      
      // 切换到结果页面（深拷贝避免Vue响应式问题）
      phase.value = 'result';
      batchResults.value = {
        totalQuestions: totalQuestions,
        correctCount: correctCount,
        accuracy: accuracy,
        answers: JSON.parse(JSON.stringify(answers.value))
      };
      
      console.log('Result page ready');
    }
    
    function backToSelect() {
      phase.value = 'select';
      currentBatchId.value = null;
      questions.value = [];
      answers.value = [];
      currentQuestion.value = null;
      batchResults.value = null;
      // 重新加载主页数据
      loadMainPageData();
    }
    
    function retryBatch() {
      startBatch(currentBatchId.value);
    }
    
    async function markAsWrong() {
      if (!currentQuestion.value) {
        alert('当前没有题目');
        return;
      }
      
      const currentQ = currentQuestion.value;
      console.log('Marking as wrong:', currentQ.word);
      
      try {
        // 深拷贝避免Vue响应式问题
        const plainQ = JSON.parse(JSON.stringify(currentQ));
        
        await saveToStore('wrongAnswers', {
          wordId: plainQ.id,
          word: plainQ.word,
          phonetic: plainQ.phonetic,
          meaning: plainQ.meaning,
          sla: plainQ.sla,
          question: plainQ.question,
          addedAt: Date.now()
        });
        console.log('Successfully saved to wrongAnswers');
        alert('已加入错题本！');
      } catch (e) {
        console.error('Error in markAsWrong:', e);
        alert('加入失败：' + e.message);
      }
    }
    
    async function startReview() {
      console.log('=== Starting review ===');
      
      try {
        const wrongWords = await getAllFromStore('wrongAnswers');
        console.log('Wrong words for review:', wrongWords.length);
        
        if (wrongWords.length === 0) {
          alert('错题本为空！继续刷题吧！');
          return;
        }
        
        const reviewWords = shuffleArray(wrongWords).slice(0, 30).map(w => ({
          id: w.wordId,
          word: w.word,
          phonetic: w.phonetic,
          meaning: w.meaning,
          sla: w.sla,
          question: w.question
        }));
        
        phase.value = 'quiz';
        currentBatchId.value = 'review';
        currentQuestionIndex.value = 0;
        questions.value = reviewWords;
        answers.value = [];
        answered.value = false;
        selectedIndex.value = -1;
        activeTab.value = 'core';
        currentQuestion.value = questions.value[0];
        
        console.log('Review started, questions:', questions.value.length);
      } catch (error) {
        console.error('Error starting review:', error);
        alert('加载错题失败：' + error.message);
      }
    }
    
    async function resetProgress() {
      if (confirm('确定要重置所有学习进度和错题本吗？此操作不可撤销！')) {
        try {
          await clearStore('wrongAnswers');
          await clearStore('batchProgress');
          
          stats.value = { totalAnswered: 0, totalCorrect: 0 };
          wrongCount.value = 0;
          alert('已重置所有数据！');
        } catch (e) {
          console.error('Error resetting:', e);
          alert('重置失败：' + e.message);
        }
      }
    }
    
    // ============ 数据导出/导入 ============
    async function exportData() {
      try {
        const wrongAnswers = await getAllFromStore('wrongAnswers');
        const batchProgress = await getAllFromStore('batchProgress');
        
        const exportObj = {
          exportDate: new Date().toISOString(),
          wrongAnswers: wrongAnswers,
          batchProgress: batchProgress
        };
        
        const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vocab-quiz-backup-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        alert('数据已导出！');
      } catch (e) {
        console.error('Export error:', e);
        alert('导出失败：' + e.message);
      }
    }
    
    async function importData(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const importObj = JSON.parse(text);
        
        if (!importObj.wrongAnswers || !importObj.batchProgress) {
          throw new Error('无效的备份文件');
        }
        
        // 清除现有数据
        await clearStore('wrongAnswers');
        await clearStore('batchProgress');
        
        // 导入错题
        for (const item of importObj.wrongAnswers) {
          await saveToStore('wrongAnswers', item);
        }
        
        // 导入进度
        for (const item of importObj.batchProgress) {
          await saveToStore('batchProgress', item);
        }
        
        // 刷新页面数据
        await loadMainPageData();
        
        alert(`导入成功！错题：${importObj.wrongAnswers.length}条，进度已恢复。`);
      } catch (e) {
        console.error('Import error:', e);
        alert('导入失败：' + e.message);
      }
    }
    
    // ============ 数据导出/导入 ============
    async function exportData() {
      try {
        const wrongAnswers = await getAllFromStore('wrongAnswers');
        const batchProgress = await getAllFromStore('batchProgress');
        
        const data = {
          exportDate: new Date().toISOString(),
          wrongAnswers,
          batchProgress
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vocab-quiz-backup-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        alert('数据已导出！');
      } catch (e) {
        console.error('Export error:', e);
        alert('导出失败：' + e.message);
      }
    }
    
    async function importData(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (!data.wrongAnswers || !data.batchProgress) {
          alert('文件格式错误！');
          return;
        }
        
        // 清空现有数据
        await clearStore('wrongAnswers');
        await clearStore('batchProgress');
        
        // 导入错题
        for (const item of data.wrongAnswers) {
          await saveToStore('wrongAnswers', item);
        }
        
        // 导入进度
        for (const item of data.batchProgress) {
          await saveToStore('batchProgress', item);
        }
        
        // 刷新页面数据
        await loadMainPageData();
        
        alert(`导入成功！错题：${data.wrongAnswers.length}条，进度：${data.batchProgress.length}条`);
      } catch (e) {
        console.error('Import error:', e);
        alert('导入失败：' + e.message);
      }
    }
    
    // ============ 生命周期 ============
    onMounted(async () => {
      console.log('=== App mounted ===');
      await loadMainPageData();
    });
    
    return {
      phase,
      currentQuestion,
      currentQuestionIndex,
      questions,
      answered,
      selectedIndex,
      batchResults,
      currentBatchId,
      answers,
      activeTab,
      stats,
      wrongCount,
      batches,
      analysisTabs,
      isCorrect,
      wrongAnswersList,
      accuracyDisplay,
      getBatchClass,
      getOptionClass,
      formatAccuracy,
      getAccuracyClass,
      startBatch,
      handleAnswer,
      nextQuestion,
      backToSelect,
      retryBatch,
      markAsWrong,
      startReview,
      resetProgress,
      exportData,
      importData
    };
  }
});

app.mount('#app');
console.log('App initialized');
