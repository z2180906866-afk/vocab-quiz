const BatchSelector = {
  template: `
    <div class="space-y-6">
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold mb-4">选择刷题批次</h2>
        <p class="text-gray-600 mb-4">共100个批次，每批约55个单词</p>
        
        <div class="mb-4 p-3 bg-green-100 rounded">
          <p>BatchSelector组件已加载</p>
          <button @click="testEmit" class="px-3 py-1 bg-green-500 text-white rounded">
            测试事件发射
          </button>
        </div>
        
        <div class="grid grid-cols-5 sm:grid-cols-10 gap-2 mb-6">
          <button
            v-for="batch in batches"
            :key="batch.id"
            @click="selectBatch(batch.id)"
            class="p-2 rounded-lg text-sm font-medium transition-all touch-target"
            :class="getBatchClass(batch.id)"
          >
            {{ batch.id }}
          </button>
        </div>
        
        <div class="flex flex-wrap gap-3">
          <button
            @click="$emit('startReview')"
            class="flex-1 sm:flex-none px-4 py-2 bg-warning text-white rounded-lg hover:bg-yellow-600 transition touch-target"
          >
            错题强化
          </button>
          <button
            @click="confirmReset"
            class="flex-1 sm:flex-none px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition touch-target"
          >
            重置进度
          </button>
        </div>
      </div>
    </div>
  `,
  
  data() {
    return {
      batches: Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }))
    };
  },
  
  methods: {
    testEmit() {
      console.log('BatchSelector: testEmit called');
      alert('测试事件发射');
      this.$emit('select-batch', 1);
    },
    
    selectBatch(batchId) {
      console.log('BatchSelector: selectBatch called with', batchId);
      this.$emit('select-batch', batchId);
    },
    
    getBatchClass(batchId) {
      return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    },
    
    confirmReset() {
      if (confirm('确定要重置所有学习进度吗？')) {
        this.$emit('reset-progress');
      }
    }
  }
};

window.BatchSelector = BatchSelector;
