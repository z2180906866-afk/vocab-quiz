const ResultScreen = {
  props: {
    results: Object,
    batchId: [Number, String]
  },
  
  template: `
    <div class="space-y-4">
      <div class="bg-white rounded-lg shadow-md p-6 text-center">
        <h2 class="text-2xl font-bold mb-4">
          {{ batchId === 'review' ? '复习完成！' : '批次 ' + batchId + ' 完成！' }}
        </h2>
        
        <div class="mb-6">
          <div class="text-6xl font-bold" :class="accuracyClass">
            {{ formatAccuracy(results.accuracy) }}
          </div>
          <div class="text-gray-600 mt-2">正确率</div>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="p-4 bg-green-50 rounded-lg">
            <div class="text-2xl font-bold text-success">{{ results.correctCount }}</div>
            <div class="text-sm text-gray-600">正确</div>
          </div>
          <div class="p-4 bg-red-50 rounded-lg">
            <div class="text-2xl font-bold text-danger">{{ results.totalQuestions - results.correctCount }}</div>
            <div class="text-sm text-gray-600">错误</div>
          </div>
        </div>
      </div>
      
      <div v-if="wrongAnswers.length > 0" class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold mb-4">错题回顾</h3>
        <div class="space-y-3">
          <div 
            v-for="answer in wrongAnswers" 
            :key="answer.wordId"
            class="p-3 bg-red-50 rounded-lg"
          >
            <div class="flex justify-between items-start">
              <div>
                <span class="font-bold text-gray-800">{{ answer.word }}</span>
              </div>
              <span class="text-sm text-red-600">错误</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="flex gap-3">
        <button
          @click="$emit('back-to-select')"
          class="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition touch-target"
        >
          返回选择
        </button>
        <button
          v-if="batchId !== 'review'"
          @click="$emit('retry-batch')"
          class="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-blue-700 transition touch-target"
        >
          再做一次
        </button>
      </div>
    </div>
  `,
  
  computed: {
    accuracyClass() {
      if (this.results.accuracy >= 0.8) return 'text-success';
      if (this.results.accuracy >= 0.6) return 'text-warning';
      return 'text-danger';
    },
    
    wrongAnswers() {
      return this.results.answers.filter(a => !a.isCorrect);
    }
  },
  
  methods: {
    formatAccuracy(value) {
      return Math.round(value * 100) + '%';
    }
  }
};

window.ResultScreen = ResultScreen;
