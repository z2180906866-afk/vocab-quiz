const fs = require('fs');
const path = require('path');
const { findSimilarWords } = require('./similarity');

const BATCH_SIZE = 55; // 50-60 words per batch

function createBatches(words, size) {
  const batches = [];
  for (let i = 0; i < words.length; i += size) {
    batches.push({
      batchId: Math.floor(i / size) + 1,
      words: words.slice(i, i + size)
    });
  }
  return batches;
}

function generateQuizQuestions(word, similarWords, allWordsMap) {
  // Create question: show word, pick correct meaning
  const options = [word.meaning];
  
  // Add similar words' meanings as distractors
  for (const similarWord of similarWords) {
    const similarData = allWordsMap.get(similarWord);
    if (similarData && options.length < 4) {
      options.push(similarData.meaning);
    }
  }
  
  // If not enough similar words, add random distractors
  const allWords = Array.from(allWordsMap.values());
  while (options.length < 4) {
    const randomWord = allWords[Math.floor(Math.random() * allWords.length)];
    if (!options.includes(randomWord.meaning) && randomWord.word !== word.word) {
      options.push(randomWord.meaning);
    }
  }
  
  // Shuffle options
  const shuffled = options.sort(() => Math.random() - 0.5);
  
  return {
    wordId: word.id,
    stem: `选择 "${word.word}" 的正确中文意思：`,
    correct: word.meaning,
    options: shuffled,
    correctIndex: shuffled.indexOf(word.meaning)
  };
}

function buildVocabIndex(words, similarMap) {
  const index = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    totalWords: words.length,
    totalBatches: Math.ceil(words.length / BATCH_SIZE),
    words: {}
  };
  
  for (const word of words) {
    const key = word.word.toLowerCase();
    index.words[key] = {
      phonetic: word.phonetic,
      meaning: word.meaning,
      batchId: Math.ceil((words.indexOf(word) + 1) / BATCH_SIZE),
      similar: similarMap.get(key) || []
    };
  }
  
  return index;
}

function buildBatchData(batch, similarMap, allWordsMap) {
  return {
    batchId: batch.batchId,
    words: batch.words.map(word => {
      const similar = similarMap.get(word.word.toLowerCase()) || [];
      const question = generateQuizQuestions(word, similar, allWordsMap);
      
      return {
        id: word.id,
        word: word.word,
        phonetic: word.phonetic,
        meaning: word.meaning,
        similar: similar,
        question: question,
        sla: word.sla || {
          coreLogic: `词根分析：${word.word}的核心含义与"${word.meaning}"相关`,
          similarWarning: `注意区分：${word.word} 与 ${similar.join(', ')} 的拼写差异`,
          extendedMeaning: '暂无引申义数据',
          examUsage: '暂无真题数据'
        }
      };
    })
  };
}

// CLI execution
if (require.main === module) {
  const inputPath = process.argv[2] || path.join(__dirname, '..', 'data', 'processed', 'vocab-filtered.json');
  const outputDir = process.argv[3] || path.join(__dirname, '..', 'data', 'processed');
  
  // Load SLA data if available
  let slaData = null;
  const slaPath = path.join(outputDir, 'vocab-sla.json');
  if (fs.existsSync(slaPath)) {
    console.log(`Loading SLA data from: ${slaPath}`);
    slaData = JSON.parse(fs.readFileSync(slaPath, 'utf-8'));
  }
  
  console.log(`\n=== Step 1: Loading filtered vocabulary ===`);
  console.log(`Input: ${inputPath}`);
  const words = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  console.log(`Loaded ${words.length} filtered words`);
  
  // Merge SLA data if available
  if (slaData) {
    const slaMap = new Map(slaData.map(w => [w.word.toLowerCase(), w.sla]));
    for (const word of words) {
      const sla = slaMap.get(word.word.toLowerCase());
      if (sla) {
        word.sla = sla;
      }
    }
    console.log(`Merged SLA data for ${slaData.length} words`);
  }
  
  console.log(`\n=== Step 2: Finding similar words ===`);
  const startTime = Date.now();
  const similarMap = findSimilarWords(words);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`Completed in ${elapsed}s`);
  
  // Create word lookup map
  const allWordsMap = new Map(words.map(w => [w.word.toLowerCase(), w]));
  
  console.log(`\n=== Step 3: Building vocabulary index ===`);
  const vocabIndex = buildVocabIndex(words, similarMap);
  const indexPath = path.join(outputDir, 'vocab-index.json');
  fs.writeFileSync(indexPath, JSON.stringify(vocabIndex, null, 2), 'utf-8');
  console.log(`Saved index: ${indexPath}`);
  
  console.log(`\n=== Step 4: Creating batches ===`);
  const batches = createBatches(words, BATCH_SIZE);
  console.log(`Created ${batches.length} batches of ~${BATCH_SIZE} words each`);
  
  for (const batch of batches) {
    const batchData = buildBatchData(batch, similarMap, allWordsMap);
    const batchPath = path.join(outputDir, `batch-${String(batch.batchId).padStart(3, '0')}.json`);
    fs.writeFileSync(batchPath, JSON.stringify(batchData, null, 2), 'utf-8');
  }
  console.log(`Saved ${batches.length} batch files`);
  
  console.log(`\n=== Build Complete ===`);
  console.log(`Total words: ${words.length}`);
  console.log(`Total batches: ${batches.length}`);
  console.log(`Output directory: ${outputDir}`);
}

module.exports = { createBatches, generateQuizQuestions, buildVocabIndex, buildBatchData };
