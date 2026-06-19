const { createApp, ref, computed, onMounted } = Vue;

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
    const stats = ref(null);
    
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
    
    const wrongAnswers = computed(() => {
      if (!batchResults.value || !batchResults.value.answers) return [];
      return batchResults.value.answers.filter(a => !a.isCorrect);
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
    
    // IndexedDB helpers
    const DB_NAME = 'VocabQuizDB';
    const DB_VERSION = 1;
    
    function openDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('wrongAnswers')) {
            db.createObjectStore('wrongAnswers', { keyPath: 'wordId' });
          }
          if (!db.objectStoreNames.contains('stats')) {
            db.createObjectStore('stats', { keyPath: 'key' });
          }
        };
      });
    }
    
    async function saveWrongAnswer(wordData) {
      const db = await openDB();
      const tx = db.transaction('wrongAnswers', 'readwrite');
      const store = tx.objectStore('wrongAnswers');
      store.put(wordData);
      return new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }
    
    async function getWrongAnswers() {
      const db = await openDB();
      const tx = db.transaction('wrongAnswers', 'readonly');
      const store = tx.objectStore('wrongAnswers');
      const request = store.getAll();
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    
    async function removeWrongAnswer(wordId) {
      const db = await openDB();
      const tx = db.transaction('wrongAnswers', 'readwrite');
      const store = tx.objectStore('wrongAnswers');
      store.delete(wordId);
      return new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }
    
    async function saveStats(newStats) {
      const db = await openDB();
      const tx = db.transaction('stats', 'readwrite');
      const store = tx.objectStore('stats');
      store.put({ key: 'global', ...newStats });
      return new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }
    
    async function loadStats() {
      const db = await openDB();
      const tx = db.transaction('stats', 'readonly');
      const store = tx.objectStore('stats');
      const request = store.get('global');
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || { totalAnswered: 0, totalCorrect: 0 });
        request.onerror = () => reject(request.error);
      });
    }
    
    async function startBatch(batchId) {
      console.log('Starting batch:', batchId);
      
      try {
        const response = await fetch(`data/processed/batch-${String(batchId).padStart(3, '0')}.json`);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        
        const batchData = await response.json();
        
        phase.value = 'quiz';
        currentBatchId.value = batchId;
        currentQuestionIndex.value = 0;
        questions.value = shuffleArray(batchData.words).slice(0, 20);
        answers.value = [];
        answered.value = false;
        selectedIndex.value = -1;
        activeTab.value = 'core';
        currentQuestion.value = questions.value[0];
        
        console.log('Quiz started, questions:', questions.value.length);
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
      
      // Save wrong answer to IndexedDB
      if (!correct) {
        await saveWrongAnswer({
          wordId: currentQ.id,
          word: currentQ.word,
          phonetic: currentQ.phonetic,
          meaning: currentQ.meaning,
          sla: currentQ.sla,
          question: currentQ.question,
          wrongCount: 1,
          lastWrong: Date.now()
        });
      } else {
        // If correct, remove from wrong answers if it was there
        await removeWrongAnswer(currentQ.id);
      }
      
      // Update stats
      const currentStats = await loadStats();
      await saveStats({
        totalAnswered: (currentStats.totalAnswered || 0) + 1,
        totalCorrect: (currentStats.totalCorrect || 0) + (correct ? 1 : 0)
      });
      
      // Vibration feedback
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
    
    function finishBatch() {
      const correctCount = answers.value.filter(a => a.isCorrect).length;
      const accuracy = correctCount / answers.value.length;
      
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
      loadGlobalStats();
    }
    
    function retryBatch() {
      startBatch(currentBatchId.value);
    }
    
    async function startReview() {
      try {
        const wrongWords = await getWrongAnswers();
        
        if (wrongWords.length === 0) {
          alert('没有错题需要复习！继续加油！');
          return;
        }
        
        // Shuffle and take up to 20 wrong words
        const reviewWords = shuffleArray(wrongWords).slice(0, 20).map(w => ({
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
      if (confirm('确定要重置所有学习进度和错题记录吗？此操作不可撤销！')) {
        const db = await openDB();
        const tx1 = db.transaction('wrongAnswers', 'readwrite');
        tx1.objectStore('wrongAnswers').clear();
        const tx2 = db.transaction('stats', 'readwrite');
        tx2.objectStore('stats').clear();
        
        stats.value = { totalAnswered: 0, totalCorrect: 0 };
        alert('进度已重置！');
      }
    }
    
    async function loadGlobalStats() {
      const s = await loadStats();
      stats.value = s;
    }
    
    onMounted(() => {
      console.log('App mounted');
      loadGlobalStats();
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
      batches,
      analysisTabs,
      isCorrect,
      wrongAnswers,
      getBatchClass,
      getOptionClass,
      formatAccuracy,
      getAccuracyClass,
      startBatch,
      handleAnswer,
      nextQuestion,
      backToSelect,
      retryBatch,
      startReview,
      resetProgress
    };
  }
});

app.mount('#app');
console.log('App initialized');
