const db = new Dexie('VocabQuizDB');

db.version(1).stores({
  wordProgress: '++id, wordId, attempts, correct, lastSeen, mastery',
  batchProgress: 'batchId, completed, accuracy, lastAttempt',
  settings: 'key, value'
});

const DB = {
  async getWordProgress(wordId) {
    return await db.wordProgress.where('wordId').equals(wordId).first();
  },

  async updateWordProgress(wordId, isCorrect) {
    const existing = await this.getWordProgress(wordId);
    
    if (existing) {
      const newAttempts = existing.attempts + 1;
      const newCorrect = existing.correct + (isCorrect ? 1 : 0);
      const newMastery = newCorrect / newAttempts;
      
      await db.wordProgress.update(existing.id, {
        attempts: newAttempts,
        correct: newCorrect,
        lastSeen: Date.now(),
        mastery: newMastery
      });
    } else {
      await db.wordProgress.add({
        wordId,
        attempts: 1,
        correct: isCorrect ? 1 : 0,
        lastSeen: Date.now(),
        mastery: isCorrect ? 1 : 0
      });
    }
  },

  async getBatchProgress(batchId) {
    return await db.batchProgress.where('batchId').equals(batchId).first();
  },

  async updateBatchProgress(batchId, accuracy) {
    const existing = await this.getBatchProgress(batchId);
    
    if (existing) {
      await db.batchProgress.update(batchId, {
        completed: existing.completed + 1,
        accuracy: accuracy,
        lastAttempt: Date.now()
      });
    } else {
      await db.batchProgress.add({
        batchId,
        completed: 1,
        accuracy,
        lastAttempt: Date.now()
      });
    }
  },

  async getAllBatchProgress() {
    return await db.batchProgress.toArray();
  },

  async getWeakWords() {
    return await db.wordProgress
      .where('mastery').below(0.6)
      .toArray();
  },

  async getSetting(key) {
    const setting = await db.settings.get(key);
    return setting ? setting.value : null;
  },

  async setSetting(key, value) {
    await db.settings.put({ key, value });
  },

  async resetAllProgress() {
    await db.wordProgress.clear();
    await db.batchProgress.clear();
    await db.settings.clear();
  },

  async getStats() {
    const allProgress = await db.wordProgress.toArray();
    const totalWords = allProgress.length;
    const totalAttempts = allProgress.reduce((sum, p) => sum + p.attempts, 0);
    const totalCorrect = allProgress.reduce((sum, p) => sum + p.correct, 0);
    const masteredWords = allProgress.filter(p => p.mastery >= 0.8).length;
    
    return {
      totalWords,
      totalAttempts,
      totalCorrect,
      accuracy: totalAttempts > 0 ? totalCorrect / totalAttempts : 0,
      masteredWords
    };
  }
};

window.DB = DB;
