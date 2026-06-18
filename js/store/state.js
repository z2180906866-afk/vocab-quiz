const AppState = Vue.reactive({
  phase: 'select',
  currentBatchId: null,
  currentQuestionIndex: 0,
  questions: [],
  answers: [],
  answered: false,
  selectedIndex: -1,
  batchResults: null,
  batchProgress: {},
  isLoading: false
});

window.AppState = AppState;
