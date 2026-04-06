// Local LLM via Ollama (http://localhost:11434)
// Uses llama3.2:3b — small, fast, runs on Mac M-series

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

async function isOllamaRunning() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch { return false; }
}

async function generate(prompt, { maxTokens = 150 } = {}) {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        options: { num_predict: maxTokens, temperature: 0.3 },
      }),
    });

    if (!res.ok) {
      console.warn(`[local-llm] Ollama returned ${res.status}`);
      return null;
    }

    const json = await res.json();
    return json.response?.trim() || null;
  } catch (err) {
    console.warn(`[local-llm] generate failed: ${err.message}`);
    return null;
  }
}

async function answerQuestion({ question, jobTitle, company, resumeText, profileInfo }) {
  const prompt = `You are filling out a job application for the role "${jobTitle}" at ${company}. Answer the following screening question concisely and professionally.

CANDIDATE BACKGROUND:
${profileInfo || ''}
${resumeText ? `\nRESUME EXCERPT:\n${resumeText.slice(0, 1500)}` : ''}

QUESTION: ${question}

INSTRUCTIONS:
- If it asks for years of experience, give a specific number based on the resume
- If it asks about work authorization, answer "Yes" (authorized to work in the US)
- If it asks about willingness to relocate, answer "Yes"
- If it asks about start date, answer "Immediately" or "2 weeks notice"
- If it asks about salary expectations, answer "Open to discussion"
- If it asks a yes/no question, just answer Yes or No
- If it asks for a number, just give the number
- Keep the answer to 1-2 sentences max
- Be direct, no fluff

ANSWER:`;

  const answer = await generate(prompt);
  if (answer) {
    console.log(`  [llm] Q: "${question}" → A: "${answer}"`);
  }
  return answer;
}

// For numeric-only fields
function extractNumber(text) {
  if (!text) return null;
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

module.exports = { isOllamaRunning, generate, answerQuestion, extractNumber };
