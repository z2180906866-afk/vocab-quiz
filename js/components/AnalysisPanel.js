const AnalysisPanel = {
  props: {
    word: Object,
    isCorrect: Boolean
  },
  
  template: `
    <div class="bg-white rounded-lg shadow-md overflow-hidden animate-slide-up">
      <div class="p-4" :class="isCorrect ? 'bg-green-50' : 'bg-red-50'">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold" :class="isCorrect ? 'text-green-800' : 'text-red-800'">
            {{ isCorrect ? '✓ 回答正确！' : '✗ 回答错误' }}
          </h3>
          <span class="text-sm" :class="isCorrect ? 'text-green-600' : 'text-red-600'">
            正确答案：{{ word.question.correct }}
          </span>
        </div>
      </div>
      
      <div class="border-b">
        <nav class="flex">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition"
            :class="activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>
      
      <div class="p-4">
        <div v-if="activeTab === 'core'" class="animate-fade-in">
          <h4 class="font-semibold text-gray-700 mb-2">🧠 核心逻辑（底层记忆）</h4>
          <p class="text-gray-600 leading-relaxed">{{ word.sla.coreLogic }}</p>
        </div>
        
        <div v-if="activeTab === 'similar'" class="animate-fade-in">
          <h4 class="font-semibold text-gray-700 mb-2">⚠️ 避坑预警（形近/易混）</h4>
          <div class="space-y-2">
            <div class="p-3 bg-yellow-50 rounded-lg">
              <p class="text-gray-700">{{ word.sla.similarWarning }}</p>
            </div>
            <div v-if="word.similar.length > 0" class="mt-3">
              <p class="text-sm text-gray-500 mb-2">形近词列表：</p>
              <div class="flex flex-wrap gap-2">
                <span 
                  v-for="s in word.similar" 
                  :key="s"
                  class="px-2 py-1 bg-gray-100 rounded text-sm"
                >
                  {{ s }}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="activeTab === 'extended'" class="animate-fade-in">
          <h4 class="font-semibold text-gray-700 mb-2">📚 高分引申（熟词僻义）</h4>
          <p class="text-gray-600 leading-relaxed">{{ word.sla.extendedMeaning }}</p>
        </div>
        
        <div v-if="activeTab === 'exam'" class="animate-fade-in">
          <h4 class="font-semibold text-gray-700 mb-2">🎯 真题闭环（考点直击）</h4>
          <p class="text-gray-600 leading-relaxed">{{ word.sla.examUsage }}</p>
        </div>
      </div>
      
      <div class="p-4 bg-gray-50 border-t">
        <h4 class="font-semibold text-gray-700 mb-2">形近词对比</h4>
        <div class="space-y-2">
          <div 
            v-for="s in word.similar.slice(0, 3)" 
            :key="s"
            class="flex items-center justify-between p-2 bg-white rounded"
          >
            <span class="font-mono">{{ s }}</span>
            <span class="text-sm text-gray-500">vs {{ word.word }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  
  data() {
    return {
      activeTab: 'core',
      tabs: [
        { id: 'core', label: '核心逻辑' },
        { id: 'similar', label: '避坑预警' },
        { id: 'extended', label: '高分引申' },
        { id: 'exam', label: '真题闭环' }
      ]
    };
  }
};

window.AnalysisPanel = AnalysisPanel;
