const fs = require('fs');
const path = require('path');

// 初中/简单词汇黑名单 - 这些词太简单，不需要形近词辨析
const SIMPLE_WORDS = new Set([
  // 冠词/代词/介词/连词
  'a', 'an', 'the', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
  'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'whose',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should',
  'can', 'could', 'may', 'might', 'must', 'need',
  'and', 'or', 'but', 'if', 'because', 'when', 'while', 'although', 'unless',
  'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'of', 'about',
  'up', 'down', 'out', 'off', 'over', 'under', 'into', 'through',
  'above', 'below', 'between', 'among', 'after', 'before',
  'not', 'no', 'yes', 'all', 'any', 'some', 'many', 'much', 'few', 'little',
  'each', 'every', 'both', 'neither', 'either', 'other', 'another',
  
  // 基础名词
  'book', 'pen', 'bag', 'box', 'bus', 'car', 'cat', 'dog', 'egg', 'eye',
  'face', 'food', 'foot', 'game', 'girl', 'hand', 'head', 'help', 'home',
  'hour', 'job', 'key', 'king', 'life', 'line', 'man', 'men', 'name',
  'room', 'side', 'time', 'water', 'way', 'week', 'word', 'work', 'year',
  'air', 'arm', 'art', 'baby', 'back', 'ball', 'bank', 'bed', 'bell',
  'bird', 'bit', 'blood', 'blow', 'board', 'boat', 'body', 'bone', 'bottom',
  'boy', 'brother', 'cake', 'call', 'capital', 'card', 'case', 'catch',
  'cause', 'center', 'chance', 'change', 'child', 'children', 'church',
  'city', 'class', 'club', 'coat', 'color', 'company', 'corner', 'cost',
  'country', 'course', 'cross', 'cry', 'cup', 'dance', 'daughter', 'day',
  'death', 'doctor', 'door', 'dream', 'dress', 'drink', 'drive', 'earth',
  'end', 'enemy', 'evening', 'event', 'everything', 'example', 'experience',
  'expression', 'eye', 'face', 'fact', 'family', 'father', 'feeling',
  'field', 'fight', 'fire', 'fish', 'floor', 'flower', 'force', 'friend',
  'front', 'fruit', 'future', 'garden', 'glass', 'god', 'gold', 'government',
  'group', 'growth', 'gun', 'hair', 'hall', 'heart', 'heat', 'hill',
  'history', 'hole', 'hope', 'horse', 'hospital', 'hotel', 'house',
  'husband', 'ice', 'idea', 'interest', 'island', 'issue', 'item',
  'joke', 'joy', 'kind', 'kitchen', 'knowledge', 'lady', 'land', 'language',
  'law', 'leader', 'leaf', 'left', 'leg', 'lesson', 'letter', 'level',
  'library', 'lie', 'light', 'list', 'love', 'lunch', 'machine', 'mail',
  'market', 'master', 'matter', 'meal', 'measure', 'meeting', 'member',
  'memory', 'message', 'method', 'middle', 'milk', 'mind', 'mine', 'minute',
  'mistake', 'model', 'moment', 'money', 'month', 'morning', 'mother',
  'mountain', 'mouth', 'music', 'nature', 'newspaper', 'night', 'noise',
  'note', 'number', 'object', 'occasion', 'office', 'operation', 'order',
  'page', 'pain', 'painting', 'paper', 'parent', 'park', 'part', 'party',
  'pass', 'past', 'path', 'patient', 'pattern', 'peace', 'people', 'period',
  'person', 'phone', 'picture', 'piece', 'place', 'plan', 'plant', 'plate',
  'play', 'player', 'pleasure', 'pocket', 'poem', 'point', 'police',
  'position', 'power', 'practice', 'president', 'price', 'problem',
  'product', 'program', 'project', 'property', 'public', 'question',
  'race', 'rain', 'reason', 'record', 'region', 'relation', 'report',
  'respect', 'rest', 'result', 'ride', 'ring', 'river', 'road', 'rock',
  'role', 'rule', 'run', 'safe', 'scene', 'school', 'science', 'sea',
  'season', 'seat', 'sense', 'service', 'set', 'ship', 'shirt', 'shoe',
  'shop', 'shoulder', 'show', 'sight', 'silence', 'silver', 'sister',
  'situation', 'size', 'sky', 'sleep', 'smile', 'snow', 'society', 'son',
  'song', 'sort', 'sound', 'south', 'space', 'speech', 'sport', 'spring',
  'square', 'stage', 'standard', 'star', 'state', 'station', 'stone',
  'store', 'story', 'street', 'student', 'study', 'success', 'sugar',
  'summer', 'sun', 'supply', 'surface', 'system', 'table', 'tea',
  'teacher', 'team', 'technology', 'television', 'temperature', 'term',
  'test', 'thing', 'thought', 'title', 'today', 'tomorrow', 'tonight',
  'tool', 'top', 'total', 'town', 'trade', 'train', 'travel', 'tree',
  'trouble', 'truth', 'type', 'unit', 'value', 'village', 'voice',
  'war', 'weather', 'weight', 'while', 'whole', 'wind', 'window',
  'wine', 'winter', 'wish', 'woman', 'wonder', 'wood', 'word', 'world',
  'writer', 'yard', 'youth', 'zoo',
  
  // 基础动词
  'ask', 'begin', 'break', 'bring', 'build', 'buy', 'carry', 'catch',
  'choose', 'come', 'cut', 'draw', 'drive', 'eat', 'fall', 'feel',
  'find', 'fly', 'forget', 'get', 'give', 'go', 'grow', 'hear', 'hide',
  'hold', 'keep', 'know', 'lay', 'lead', 'learn', 'leave', 'lend',
  'let', 'lie', 'lose', 'make', 'mean', 'meet', 'pay', 'put', 'read',
  'ride', 'rise', 'run', 'say', 'see', 'sell', 'send', 'set', 'show',
  'shut', 'sing', 'sit', 'sleep', 'speak', 'spend', 'stand', 'start',
  'steal', 'stick', 'stop', 'strike', 'swim', 'take', 'teach', 'tell',
  'think', 'throw', 'understand', 'wake', 'wear', 'win', 'write',
  
  // 基础形容词
  'bad', 'big', 'black', 'blue', 'bright', 'cheap', 'clean', 'clear',
  'close', 'cold', 'common', 'cool', 'dangerous', 'dark', 'dead', 'dear',
  'deep', 'dry', 'early', 'easy', 'empty', 'enough', 'even', 'ever',
  'every', 'far', 'fast', 'fat', 'final', 'fine', 'foreign', 'free',
  'full', 'glad', 'good', 'great', 'happy', 'hard', 'heavy', 'high',
  'hot', 'huge', 'human', 'hungry', 'ill', 'impossible', 'interesting',
  'just', 'large', 'last', 'late', 'least', 'left', 'less', 'long',
  'low', 'main', 'major', 'modern', 'more', 'most', 'natural', 'near',
  'necessary', 'new', 'nice', 'normal', 'old', 'only', 'open', 'opposite',
  'own', 'particular', 'past', 'perfect', 'physical', 'poor', 'popular',
  'possible', 'present', 'pretty', 'private', 'probable', 'public',
  'quick', 'quiet', 'ready', 'real', 'recent', 'rich', 'right', 'round',
  'sad', 'safe', 'same', 'second', 'serious', 'several', 'short',
  'shy', 'sick', 'significant', 'similar', 'simple', 'single', 'small',
  'soft', 'sorry', 'special', 'strange', 'strong', 'such', 'sure',
  'sweet', 'tall', 'terrible', 'thick', 'thin', 'tired', 'together',
  'traditional', 'true', 'usual', 'warm', 'weak', 'wet', 'white',
  'wide', 'wild', 'wrong', 'young',
  
  // 基础副词
  'again', 'ago', 'already', 'also', 'always', 'away', 'back', 'before',
  'behind', 'certainly', 'clearly', 'close', 'deeply', 'directly',
  'early', 'easily', 'else', 'especially', 'even', 'ever', 'everywhere',
  'far', 'fast', 'finally', 'first', 'forward', 'free', 'fully',
  'generally', 'hard', 'hardly', 'here', 'high', 'however', 'immediately',
  'indeed', 'instead', 'just', 'last', 'late', 'later', 'likely',
  'long', 'mainly', 'maybe', 'more', 'moreover', 'most', 'mostly',
  'much', 'nearly', 'never', 'next', 'now', 'often', 'once', 'only',
  'perhaps', 'personally', 'probably', 'quickly', 'quite', 'rather',
  'really', 'recently', 'right', 'seriously', 'several', 'simply',
  'slowly', 'so', 'sometimes', 'soon', 'still', 'strongly', 'sure',
  'then', 'there', 'therefore', 'throughout', 'together', 'tomorrow',
  'tonight', 'too', 'truly', 'usually', 'very', 'well', 'when',
  'where', 'why', 'yet'
]);

function filterWords(words) {
  const filtered = [];
  const removed = [];
  
  for (const word of words) {
    const lowerWord = word.word.toLowerCase().trim();
    
    // 跳过简单词汇
    if (SIMPLE_WORDS.has(lowerWord)) {
      removed.push(word.word);
      continue;
    }
    
    // 跳过过短的词（3个字母以下大多是简单词）
    if (lowerWord.length <= 2) {
      removed.push(word.word);
      continue;
    }
    
    filtered.push(word);
  }
  
  return { filtered, removed };
}

// CLI execution
if (require.main === module) {
  const inputPath = process.argv[2] || path.join(__dirname, '..', 'data', 'processed', 'vocab-raw.json');
  const outputPath = process.argv[3] || path.join(__dirname, '..', 'data', 'processed', 'vocab-filtered.json');
  
  console.log(`Loading words from: ${inputPath}`);
  const words = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  console.log(`Original word count: ${words.length}`);
  
  const { filtered, removed } = filterWords(words);
  console.log(`Filtered word count: ${filtered.length}`);
  console.log(`Removed ${removed.length} simple words`);
  
  // Show some removed examples
  console.log('\nRemoved examples (first 20):');
  console.log(removed.slice(0, 20).join(', '));
  
  fs.writeFileSync(outputPath, JSON.stringify(filtered, null, 2), 'utf-8');
  console.log(`\nSaved to: ${outputPath}`);
}

module.exports = { filterWords, SIMPLE_WORDS };
