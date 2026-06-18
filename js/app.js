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
    
    function handleAnswer(index) {
      if (answered.value) return;
      
      answered.value = true;
      selectedIndex.value = index;
      
      const currentQ = questions.value[currentQuestionIndex.value];
      const correct = index === currentQ.question.correctIndex;
      
      answers.value.push({
        wordId: currentQ.id,
        word: currentQ.word,
        selected: index,
        correct: currentQ.question.correctIndex,
        isCorrect: correct
      });
      
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
    }
    
    function retryBatch() {
      startBatch(currentBatchId.value);
    }
    
    function startReview() {
      alert('错题强化功能开发中...');
    }
    
    function resetProgress() {
      if (confirm('确定要重置所有学习进度吗？')) {
        alert('进度已重置！');
      }
    }
    
    onMounted(() => {
      console.log('App mounted');
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
