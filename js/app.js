const { createApp, ref, computed, onMounted } = Vue;

// ============ IndexedDB 单例 ============
let dbInstance = null;

function getDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VocabQuizDB', 2);
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      console.log('DB upgrade needed');
      if (!db.objectStoreNames.contains('wrongAnswers')) {
        db.createObjectStore('wrongAnswers', { keyPath: 'wordId' });
        console.log('Created wrongAnswers store');
      }
      if (!db.objectStoreNames.contains('batchProgress')) {
        db.createObjectStore('batchProgress', { keyPath: 'batchId' });
        console.log('Created batchProgress store');
      }
    };
    
    request.onsuccess = (e) => {
      dbInstance = e.target.result;
      console.log('DB opened successfully');
      resolve(dbInstance);
    };
    
    request.onerror = (e) => {
      console.error('DB open error:', e.target.error);
      reject(e.target.error);
    };
  });
}

async function dbPut(storeName, data) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGetAll(storeName) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(storeName, key) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(storeName, key) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
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
      console.log('Loading main page data...');
      
      try {
        // 加载错题数量
        const wrongWords = await dbGetAll('wrongAnswers');
        wrongCount.value = wrongWords.length;
        console.log('Wrong answers loaded:', wrongWords.length);
        
        // 加载统计数据
        const savedStats = await dbGet('batchProgress', '__global_stats__');
        if (savedStats) {
          stats.value = {
            totalAnswered: savedStats.totalAnswered || 0,
            totalCorrect: savedStats.totalCorrect || 0
          };
          console.log('Stats loaded:', stats.value);
        } else {
          stats.value = { totalAnswered: 0, totalCorrect: 0 };
          console.log('No stats found, using defaults');
        }
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
      
      answers.value.push({
        wordId: currentQ.id,
        word: currentQ.word,
        phonetic: currentQ.phonetic,
        meaning: currentQ.meaning,
        selected: index,
        correct: currentQ.question.correctIndex,
        isCorrect: correct,
        sla: currentQ.sla,
        question: currentQ.question
      });
      
      // 答错自动加入错题本
      if (!correct) {
        try {
          await dbPut('wrongAnswers', {
            wordId: currentQ.id,
            word: currentQ.word,
            phonetic: currentQ.phonetic,
            meaning: currentQ.meaning,
            sla: currentQ.sla,
            question: currentQ.question,
            addedAt: Date.now(),
            source: 'auto'
          });
          console.log('Wrong answer saved:', currentQ.word);
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
      const correctCount = answers.value.filter(a => a.isCorrect).length;
      const accuracy = correctCount / answers.value.length;
      
      // 保存批次统计到IndexedDB
      try {
        // 更新全局统计
        const existingStats = await dbGet('batchProgress', '__global_stats__');
        const newStats = {
          batchId: '__global_stats__',
          totalAnswered: (existingStats?.totalAnswered || 0) + answers.value.length,
          totalCorrect: (existingStats?.totalCorrect || 0) + correctCount
        };
        await dbPut('batchProgress', newStats);
        console.log('Global stats saved:', newStats);
        
        // 保存批次进度
        await dbPut('batchProgress', {
          batchId: currentBatchId.value,
          completed: true,
          accuracy: accuracy,
          completedAt: Date.now()
        });
        console.log('Batch progress saved:', currentBatchId.value);
      } catch (e) {
        console.error('Error saving batch results:', e);
      }
      
      phase.value = 'result';
      batchResults.value = {
        totalQuestions: questions.value.length,
        correctCount,
        accuracy,
        answers: answers.value
      };
    }
    
    function backToSelect() {
      phase.value = 'select';
      currentBatchId.value = null;
      questions.value = [];
      answers.value = [];
      currentQuestion.value = null;
      // 重新加载主页数据
      loadMainPageData();
    }
    
    function retryBatch() {
      startBatch(currentBatchId.value);
    }
    
    async function markAsWrong() {
      if (!currentQuestion.value) return;
      
      const currentQ = currentQuestion.value;
      
      try {
        await dbPut('wrongAnswers', {
          wordId: currentQ.id,
          word: currentQ.word,
          phonetic: currentQ.phonetic,
          meaning: currentQ.meaning,
          sla: currentQ.sla,
          question: currentQ.question,
          addedAt: Date.now(),
          source: 'manual'
        });
        console.log('Manually marked as wrong:', currentQ.word);
        alert('✅ 已加入错题本！');
      } catch (e) {
        console.error('Error marking as wrong:', e);
        alert('加入失败，请重试');
      }
    }
    
    async function startReview() {
      try {
        const wrongWords = await dbGetAll('wrongAnswers');
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
          const db = await getDB();
          const tx1 = db.transaction('wrongAnswers', 'readwrite');
          tx1.objectStore('wrongAnswers').clear();
          const tx2 = db.transaction('batchProgress', 'readwrite');
          tx2.objectStore('batchProgress').clear();
          
          // 等待事务完成
          await new Promise((resolve, reject) => {
            tx2.oncomplete = resolve;
            tx2.onerror = reject;
          });
          
          stats.value = { totalAnswered: 0, totalCorrect: 0 };
          wrongCount.value = 0;
          alert('✅ 已重置所有数据！');
        } catch (e) {
          console.error('Error resetting:', e);
          alert('重置失败：' + e.message);
        }
      }
    }
    
    // ============ 生命周期 ============
    onMounted(async () => {
      console.log('App mounted');
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
      resetProgress
    };
  }
});

app.mount('#app');
console.log('App initialized');
