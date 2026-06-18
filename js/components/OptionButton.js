const OptionButton = {
  props: {
    option: String,
    index: Number,
    answered: Boolean,
    selectedIndex: Number,
    correctIndex: Number
  },
  
  template: `
    <button
      @click="$emit('select', index)"
      :disabled="answered"
      class="p-4 rounded-lg border-2 text-left transition-all touch-target"
      :class="buttonClass"
    >
      <span class="font-medium">{{ option }}</span>
    </button>
  `,
  
  computed: {
    buttonClass() {
      if (!this.answered) {
        return 'border-gray-200 hover:border-primary hover:bg-blue-50';
      }
      
      if (this.index === this.correctIndex) {
        return 'option-correct animate-correct-pop';
      }
      
      if (this.index === this.selectedIndex && this.index !== this.correctIndex) {
        return 'option-wrong animate-shake';
      }
      
      return 'border-gray-200 opacity-50';
    }
  }
};

window.OptionButton = OptionButton;
