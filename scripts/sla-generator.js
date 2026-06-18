const https = require('https');
const fs = require('fs');

const API_KEY = process.env.DEEPSEEK_API_KEY || '';
const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';

async function callDeepSeekAPI(messages) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1500
    });

    const options = {
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (parsed.error) {
            reject(new Error(parsed.error.message));
          } else {
            resolve(parsed.choices[0].message.content);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function parseSLAResponse(response) {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return {
      coreLogic: response.substring(0, 300),
      similarWarning: '',
      extendedMeaning: '',
      examUsage: ''
    };
  } catch (e) {
    return {
      coreLogic: response.substring(0, 300),
      similarWarning: '',
      extendedMeaning: '',
      examUsage: ''
    };
  }
}

const SYSTEM_PROMPT = `# 核心任务
请作为精通词源学与考研英语二命题规律的词汇数据专家，严格按照以下优化后的"动态四维精解规则"对输入的词汇进行结构化解析。在生成每个单词的解析时，必须严格做到详略得当、精简去噪，单个单词的总解析字数绝对不允许超过 600 字。

# 动态四维精解规则

* **【核心逻辑（底层记忆）】**：清晰、直接地给出词根词缀演变逻辑或核心物理动作，用于说明该词的词义本源。**严禁使用冗长、矫情的文学比喻**，用最凝练、科学的语言直击动作/画面本质。
* **【避坑预警（形近/易混）】**：**（按需生成：若该词在考研中没有容易混淆的显性形近词，则直接省略本项，不生成此标签）**。若存在易混词，请列出几个在拼写上极度相似的词，并进行字母级的差异对比与词义辨析。
* **【高分引申（熟词僻义）】**：给出该词在考研历年真题或主流外刊（如《经济学人》）中出现过的、高频的**非字面意思或深层僻义**。**严禁展示任何大纲初级基础释义或普通常见词组**。
* **【真题闭环（考点直击）】**：**（按需生成：如果该词本身属于基础简单词，或在真题中没有特殊需要注意的经典干扰项/核心题眼，则直接省略本项，不生成此标签）**。若存在核心考点，请给出该词在真题中作为核心题眼或干扰项出现过的核心短语、固定搭配或真题高分例句。

# 解析密度控制原则
1. **详略得当**：根据单词在考研中的实际权重和难易度动态调整篇幅。越是简单的词，越要触发"省略机制"；越是核心多义词，越要提炼高信息密度的精华。
2. **拒绝冗余**：不生成任何废话、不解释常识、不展示没有考研区分度的普通词组。确保所有文本利于快速扫读和记忆。

# 输出格式
严格按JSON格式输出，不要输出任何其他内容：
{
  "coreLogic": "词根词缀逻辑，100-200字",
  "similarWarning": "形近词对比（若无可省略，留空字符串）",
  "extendedMeaning": "考研僻义（若无特殊僻义，留空字符串）",
  "examUsage": "真题考点（若无特殊考点，留空字符串）"
}`;

async function generateSLAForWord(word, phonetic, meaning, similarWords) {
  const similarList = similarWords.length > 0 ? similarWords.join(', ') : '无明显形近词';
  
  const userPrompt = `单词：${word}
音标：${phonetic}
中文释义：${meaning}
形近词参考：${similarList}

请严格按照动态四维精解规则生成解析，总字数不超过600字。只输出JSON。`;

  try {
    const response = await callDeepSeekAPI([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ]);
    return parseSLAResponse(response);
  } catch (error) {
    console.error(`Error for ${word}:`, error.message);
    return {
      coreLogic: '生成失败',
      similarWarning: '',
      extendedMeaning: '',
      examUsage: ''
    };
  }
}

async function generateSLABatch(words, similarMap, outputPath = null) {
  const results = [];
  
  // Load existing results
  if (outputPath && fs.existsSync(outputPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      results.push(...existing);
      console.log(`Loaded ${existing.length} existing results`);
    } catch (e) {}
  }
  
  const processedWords = new Set(results.map(r => r.word.toLowerCase()));
  const unprocessedWords = words.filter(w => !processedWords.has(w.word.toLowerCase()));
  
  console.log(`Total words: ${words.length}`);
  console.log(`Already processed: ${results.length}`);
  console.log(`Remaining: ${unprocessedWords.length}`);
  
  for (let i = 0; i < unprocessedWords.length; i++) {
    const word = unprocessedWords[i];
    const batchNum = i + 1;
    
    if (batchNum % 10 === 0 || batchNum === 1) {
      console.log(`Processing ${batchNum}/${unprocessedWords.length}: ${word.word}`);
    }
    
    let retries = 3;
    let success = false;
    
    while (retries > 0 && !success) {
      try {
        const similar = similarMap.get(word.word.toLowerCase()) || [];
        const sla = await generateSLAForWord(word.word, word.phonetic, word.meaning, similar);
        results.push({ ...word, similar, sla });
        success = true;
        
        // Save every 5 words
        if (outputPath && batchNum % 5 === 0) {
          fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
        }
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error(`Failed for ${word.word} after 3 retries`);
          results.push({ ...word, similar: [], sla: { coreLogic: '生成失败', similarWarning: '', extendedMeaning: '', examUsage: '' }});
        } else {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 800));
  }
  
  if (outputPath) {
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  }
  
  return results;
}

// Parse TXT file to word objects
function parseTxtFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const words = [];
  
  for (const line of lines) {
    // Pattern: word /phonetic/ meaning
    const match = line.trim().match(/^([a-zA-Z][a-zA-Z\s-]*?)\s+(\/[^\/]+\/)\s+(.+)$/);
    if (match) {
      const [, word, phonetic, meaning] = match;
      words.push({
        id: word.trim().toLowerCase().replace(/\s+/g, '_'),
        word: word.trim(),
        phonetic: phonetic.trim(),
        meaning: meaning.trim()
      });
    }
  }
  
  return words;
}

if (require.main === module) {
  if (!API_KEY) {
    console.error('Error: DEEPSEEK_API_KEY environment variable required');
    process.exit(1);
  }
  
  const wordsPath = process.argv[2] || 'data/user-words-utf8.txt';
  const similarPath = process.argv[3] || 'data/processed/similar-words.json';
  const outputPath = process.argv[4] || 'data/processed/vocab-sla-new.json';
  
  console.log(`Loading words from: ${wordsPath}`);
  const words = parseTxtFile(wordsPath);
  console.log(`Parsed ${words.length} words from TXT`);
  
  console.log(`Loading similar words from: ${similarPath}`);
  const similarObj = JSON.parse(fs.readFileSync(similarPath, 'utf-8'));
  const similarMap = new Map(Object.entries(similarObj));
  
  console.log(`\n=== Starting SLA Generation (Optimized) ===`);
  console.log(`API: ${API_URL}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Max 600 chars per word`);
  
  const startTime = Date.now();
  
  generateSLABatch(words, similarMap, outputPath)
    .then(results => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n=== Generation Complete ===`);
      console.log(`Total results: ${results.length}`);
      console.log(`Time elapsed: ${elapsed}s`);
      console.log(`Saved to: ${outputPath}`);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { generateSLAForWord, generateSLABatch };
