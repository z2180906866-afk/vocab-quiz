function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  const matrix = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[b.length][a.length];
}

function calculateSimilarity(word1, word2) {
  const a = word1.toLowerCase();
  const b = word2.toLowerCase();
  
  // Skip if identical
  if (a === b) return 0;
  
  // Skip if length difference > 2 (optimization)
  if (Math.abs(a.length - b.length) > 2) return 0;
  
  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  
  return 1 - (distance / maxLen);
}

function findSimilarWords(words, threshold = 0.6, maxSimilar = 8) {
  const wordList = words.map(w => w.word.toLowerCase());
  const similarMap = new Map();
  
  // Pre-group by length for optimization
  const byLength = new Map();
  for (const word of wordList) {
    const len = word.length;
    if (!byLength.has(len)) byLength.set(len, []);
    byLength.get(len).push(word);
  }
  
  // Compare words
  for (let i = 0; i < wordList.length; i++) {
    const word1 = wordList[i];
    const candidates = [];
    
    // Only compare with words of similar length (±2)
    for (let len = word1.length - 2; len <= word1.length + 2; len++) {
      const group = byLength.get(len) || [];
      for (const word2 of group) {
        if (word1 === word2) continue;
        const score = calculateSimilarity(word1, word2);
        if (score >= threshold) {
          candidates.push({ word: word2, score });
        }
      }
    }
    
    // Sort by similarity score (descending) and take top N
    candidates.sort((a, b) => b.score - a.score);
    const topSimilar = candidates.slice(0, maxSimilar).map(c => c.word);
    
    similarMap.set(word1, topSimilar);
  }
  
  return similarMap;
}

// CLI execution
if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  
  const inputPath = process.argv[2] || path.join(__dirname, '..', 'data', 'processed', 'vocab-raw.json');
  const outputPath = process.argv[3] || path.join(__dirname, '..', 'data', 'processed', 'similar-words.json');
  
  console.log(`Loading words from: ${inputPath}`);
  const words = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  
  console.log(`Finding similar words for ${words.length} words...`);
  const startTime = Date.now();
  const similarMap = findSimilarWords(words);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log(`Completed in ${elapsed}s`);
  
  // Convert Map to object for JSON serialization
  const result = {};
  for (const [word, similar] of similarMap) {
    result[word] = similar;
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`Saved to: ${outputPath}`);
  
  // Show some examples
  const examples = Array.from(similarMap.entries()).slice(0, 5);
  console.log('\nExamples:');
  for (const [word, similar] of examples) {
    console.log(`  ${word}: ${similar.join(', ')}`);
  }
}

module.exports = { levenshteinDistance, calculateSimilarity, findSimilarWords };
