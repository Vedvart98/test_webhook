const axios = require('axios');

async function generateAIReply(userMessage, persona) {
  const prompt = `
You are a WhatsApp chatbot.

Persona: ${persona}
Language: Hindi, English or Hinglish (auto detect)

User message:
"${userMessage}"

Reply professionally, short and friendly.
`;

  const response = await axios.post(
    `${process.env.OLLAMA_URL}/api/generate`,
    {
      model: process.env.OLLAMA_MODEL,
      prompt,
      stream: false
    }
  );

  return response.data.response;
}

module.exports = { generateAIReply };
