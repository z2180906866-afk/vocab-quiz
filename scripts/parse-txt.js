const fs = require('fs');
const path = require('path');

function parseVocabularyTxt(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const words = [];
  const errors = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip header lines (like "2026年考研英语大纲词（正序版）")
    if (!line.includes('/') || !line.match(/\//)) {
      continue;
    }
    
    // Pattern: word /phonetic/ meaning
    // Example: abandon /ə'bændən/ vt.离弃，丢弃；遗弃，抛弃；放弃
    const match = line.match(/^([a-zA-Z][a-zA-Z\s-]*?)\s+(\/[^\/]+\/)\s+(.+)$/);
    
    if (match) {
      const [, word, phonetic, meaning] = match;
      words.push({
        id: word.trim().toLowerCase().replace(/\s+/g, '_'),
        word: word.trim(),
        phonetic: phonetic.trim(),
        meaning: meaning.trim()
      });
    } else {
      // Try alternative patterns
      // Pattern: word /phonetic/ (no space before phonetic)
      const altMatch = line.match(/^([a-zA-Z][a-zA-Z\s-]*?)(\/[^\/]+\/)\s+(.+)$/);
      if (altMatch) {
        const [, word, phonetic, meaning] = altMatch;
        words.push({
          id: word.trim().toLowerCase().replace(/\s+/g, '_'),
          word: word.trim(),
          phonetic: phonetic.trim(),
          meaning: meaning.trim()
        });
      } else {
        errors.push({ line: i + 1, content: line });
      }
    }
  }
  
  return { words, errors };
}

function saveToJson(data, outputPath) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
}

// CLI execution
if (require.main === module) {
  const inputPath = process.argv[2] || path.join(__dirname, '..', 'data', 'raw', 'vocabulary.txt');
  const outputPath = process.argv[3] || path.join(__dirname, '..', 'data', 'processed', 'vocab-raw.json');
  
  console.log(`Parsing: ${inputPath}`);
  const result = parseVocabularyTxt(inputPath);
  
  console.log(`Parsed ${result.words.length} words`);
  if (result.errors.length > 0) {
    console.log(`${result.errors.length} parsing errors:`);
    result.errors.slice(0, 5).forEach(e => console.log(`  Line ${e.line}: ${e.content}`));
  }
  
  saveToJson(result.words, outputPath);
  console.log(`Saved to: ${outputPath}`);
}

module.exports = { parseVocabularyTxt, saveToJson };
