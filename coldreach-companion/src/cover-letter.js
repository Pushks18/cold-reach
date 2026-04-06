const OpenAI = require('openai');

let client = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

async function generateCoverLetter({ jobTitle, company, jobDescription, userProfile }) {
  const openai = getClient();
  if (!openai) {
    console.warn('[cover-letter] OPENAI_API_KEY not set, skipping cover letter generation');
    return '';
  }

  const name = userProfile?.full_name || 'the applicant';
  const skills = (userProfile?.skills || []).join(', ') || 'various relevant skills';
  const descSnippet = (jobDescription || '').slice(0, 500);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: 'You are a professional job application assistant. Write concise, genuine cover letters.',
        },
        {
          role: 'user',
          content: `Write a concise 3-paragraph cover letter for ${name} applying to the ${jobTitle} role at ${company}. Skills: ${skills}. Job description excerpt: "${descSnippet}". Keep it under 250 words. Do not include a date or address header.`,
        },
      ],
    });
    return response.choices[0]?.message?.content?.trim() || '';
  } catch (err) {
    console.error('[cover-letter] generation failed:', err.message);
    return '';
  }
}

module.exports = { generateCoverLetter };
