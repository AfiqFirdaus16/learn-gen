require('dotenv').config({ path: './.env' });
const { Groq } = require('groq-sdk');

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

(async () => {
  const groqPrompt = [
    'Video learning brief:',
    'Topic/material: Basic JavaScript Variables',
    'Presenter persona: Student',
    'Audience level: pemula',
    'Learning style: Visual',
    'Teaching tone: ramah',
    'Duration: 2 minute(s)',
    'Target script length: approximately 220 words',
    'Presenter theme: Tema Warm Mentor',
    'Voice: Elli',
    'Use simple Indonesian examples.'
  ].join('\n');

  try {
    const response = await client.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational scriptwriter. Create a clear, engaging learning video script in plain text, suitable for a student audience. Keep the language natural, compact, and easy to understand. Do not use markdown, emojis, bullet lists, or stage directions. Return only the final script text.'
        },
        {
          role: 'user',
          content: groqPrompt
        }
      ],
      model: 'qwen/qwen3.8-27b',
      temperature: 0.7,
    });

    console.log('STATUS: success');
    console.log('CONTENT:', response.choices[0]?.message?.content || 'NO_CONTENT');
    console.log('TOKENS:', response.usage);
  } catch (error) {
    console.log('STATUS: error');
    console.log('MESSAGE:', error?.error?.message || error?.message || String(error));
    console.log('DETAIL:', JSON.stringify(error?.response?.data || error, null, 2));
  }
})();
