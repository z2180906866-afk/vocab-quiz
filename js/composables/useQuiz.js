const useQuiz = () => {
  const progress = useProgress();

  const startBatch = async (batchId) => {
    AppState.isLoading = true;
    
    try {
      const response = await fetch(`data/processed/batch-${String(batchId).padStart(3, '0')}.json`);
      const batchData = await response.json();
      
      AppState.phase = 'quiz';
      AppState.currentBatchId = batchId;
      AppState.currentQuestionIndex = 0;
      AppState.questions = Utils.shuffle(batchData.words);
      AppState.answers = [];
      AppState.answered = false;
      AppState.selectedIndex = -1;
    } catch (error) {
      console.error('Error loading batch:', error);
      alert('加载批次数据失败，请检查数据文件是否存在。');
    } finally {
      AppState.isLoading = false;
    }
  };

  const startReview = async () => {
    AppState.isLoading = true;
    
    try {
      const weakWords = await progress.getWeakWords();
      
      if (weakWords.length === 0) {
        alert('没有错题需要复习！');
        AppState.isLoading = false;
        return;
      }

      const allWords = await loadAllWordsForReview(weakWords);
      
      if (allWords.length === 0) {
        alert('无法加载复习数据！');
        AppState.isLoading = false;
        return;
      }

      AppState.phase = 'quiz';
      AppState.currentBatchId = 'review';
      AppState.currentQuestionIndex = 0;
      AppState.questions = Utils.shuffle(allWords).slice(0, 20);
      AppState.answers = [];
      AppState.answered = false;
      AppState.selectedIndex = -1;
    } catch (error) {
      console.error('Error starting review:', error);
      alert('启动复习模式失败！');
    } finally {
      AppState.isLoading = false;
    }
  };

  const loadAllWordsForReview = async (weakWords) => {
    const weakWordIds = new Set(weakWords.map(w => w.wordId));
    const allWords = [];
    
    for (let i = 1; i <= 100; i++) {
      try {
        const response = await fetch(`data/processed/batch-${String(i).padStart(3, '0')}.json`);
        const batchData = await response.json();
        
        for (const word of batchData.words) {
          if (weakWordIds.has(word.id)) {
            allWords.push(word);
          }
        }
      } catch (e) {
        break;
      }
    }
    
    return allWords;
  };

  const handleAnswer = async (selectedIndex) => {
    if (AppState.answered) return;
    
    AppState.answered = true;
    AppState.selectedIndex = selectedIndex;
    
    const currentQuestion = AppState.questions[AppState.currentQuestionIndex];
    const isCorrect = selectedIndex === currentQuestion.question.correctIndex;
    
    await progress.recordAnswer(currentQuestion.id, isCorrect);
    
    AppState.answers.push({
      wordId: currentQuestion.id,
      word: currentQuestion.word,
      selected: selectedIndex,
      correct: currentQuestion.question.correctIndex,
      isCorrect
    });

    Utils.vibrate(isCorrect ? [50] : [100, 50, 100]);
  };

  const nextQuestion = () => {
    if (AppState.currentQuestionIndex < AppState.questions.length - 1) {
      AppState.currentQuestionIndex++;
      AppState.answered = false;
      AppState.selectedIndex = -1;
    } else {
      finishBatch();
    }
  };

  const finishBatch = async () => {
    const correctCount = AppState.answers.filter(a => a.isCorrect).length;
    const accuracy = correctCount / AppState.answers.length;
    
    await progress.recordBatchCompletion(AppState.currentBatchId, accuracy);
    
    AppState.phase = 'result';
    AppState.batchResults = {
      totalQuestions: AppState.questions.length,
      correctCount,
      accuracy,
      answers: AppState.answers,
      timeSpent: 0
    };
  };

  const backToSelect = () => {
    AppState.phase = 'select';
    AppState.currentBatchId = null;
    AppState.questions = [];
    AppState.answers = [];
  };

  const retryBatch = () => {
    startBatch(AppState.currentBatchId);
  };

  return {
    startBatch,
    startReview,
    handleAnswer,
    nextQuestion,
    backToSelect,
    retryBatch
  };
};

window.useQuiz = useQuiz;
