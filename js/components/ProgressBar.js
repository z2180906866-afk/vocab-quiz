const ProgressBar = {
  props: {
    current: Number,
    total: Number
  },
  
  template: `
    <div class="bg-white rounded-lg shadow-sm p-3">
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm text-gray-600">进度</span>
        <span class="text-sm font-medium text-primary">{{ current }} / {{ total }}</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div 
          class="bg-primary h-2 rounded-full transition-all duration-300"
          :style="{ width: percentage + '%' }"
        ></div>
      </div>
    </div>
  `,
  
  computed: {
    percentage() {
      return Math.round((this.current / this.total) * 100);
    }
  }
};

window.ProgressBar = ProgressBar;
