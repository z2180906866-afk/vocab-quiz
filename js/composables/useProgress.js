const useProgress = () => {
  const loadBatchProgress = async () => {
    const allProgress = await DB.getAllBatchProgress();
    AppState.batchProgress = {};
    for (const p of allProgress) {
      AppState.batchProgress[p.batchId] = p;
    }
  };

  const recordAnswer = async (wordId, isCorrect) => {
    await DB.updateWordProgress(wordId, isCorrect);
  };

  const recordBatchCompletion = async (batchId, accuracy) => {
    await DB.updateBatchProgress(batchId, accuracy);
    await loadBatchProgress();
  };

  const getStats = async () => {
    return await DB.getStats();
  };

  const getWeakWords = async () => {
    return await DB.getWeakWords();
  };

  const resetAllProgress = async () => {
    await DB.resetAllProgress();
    await loadBatchProgress();
  };

  return {
    loadBatchProgress,
    recordAnswer,
    recordBatchCompletion,
    getStats,
    getWeakWords,
    resetAllProgress
  };
};

window.useProgress = useProgress;
