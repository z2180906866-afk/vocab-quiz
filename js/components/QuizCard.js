const QuizCard = {
  props: {
    question: Object,
    questionIndex: Number,
    totalQuestions: Number,
    answered: Boolean,
    selectedIndex: Number
  },
  
  template: `
    <div class="space-y-4">
      <progress-bar 
        :current="questionIndex + 1" 
        :total="totalQuestions"
      ></progress-bar>
      
      <div class="bg-white rounded-lg shadow-md p-6 animate-fade-in">
        <div class="text-center mb-6">
          <div class="text-3xl font-bold text-gray-800 mb-2">
            {{ question.word }}
          </div>
          <div class="text-lg text-gray-500">
            {{ question.phonetic }}
          </div>
        </div>
        
        <div class="text-center mb-4">
          <p class="text-gray-600">选择正确的中文意思：</p>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <option-button
            v-for="(option, index) in question.question.options"
            :key="index"
            :option="option"
            :index="index"
            :answered="answered"
            :selected-index="selectedIndex"
            :correct-index="question.question.correctIndex"
            @select="handleSelect"
          ></option-button>
        </div>
      </div>
      
      <analysis-panel
        v-if="answered"
        :word="question"
        :is-correct="selectedIndex === question.question.correctIndex"
      ></analysis-panel>
      
      <div v-if="answered" class="text-center">
        <button
          @click="$emit('next')"
          class="px-8 py-3 bg-primary text-white rounded-lg hover:bg-blue-700 transition touch-target text-lg"
        >
          {{ questionIndex < totalQuestions - 1 ? '下一题' : '查看结果' }}
        </button>
      </div>
    </div>
  `,
  
  methods: {
    handleSelect(index) {
      if (!this.answered) {
        this.$emit('answer', index);
      }
    }
  }
};

window.QuizCard = QuizCard;
