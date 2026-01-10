const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

/* WEBHOOK VERIFICATION */
app.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    console.log("WEBHOOK VERIFIED");
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

/* RECEIVE MESSAGE & REPLY */
app.post("/", async (req, res) => {
  console.log("Webhook received:", JSON.stringify(req.body, null, 2));

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message || !message.text?.body) {
      return res.sendStatus(200);
    }

    const from = message.from;
    const text = message.text.body;

    console.log("User:", from);
    console.log("Message:", text);

    // 🔥 OPTION 1: OLLAMA (LOCAL - RECOMMENDED, FREE)
    let reply;
    try {
      const aiResponse = await axios.post("http://localhost:11434/api/chat", {
        model: "llama3.1",  // or your model name
        messages: [
          {
            role: "system",
            content: "You are a helpful WhatsApp assistant for a mortgage and home loan company. Reply briefly, professionally, in English or Hinglish. Offer next steps."
          },
          {
            role: "user",
            content: text
          }
        ],
        stream: false
      });

      reply = aiResponse.data.message?.content || "Thanks for messaging! How can I help with your home loan today?";
    } catch (ollamaErr) {
      console.log("Ollama unavailable, using fallback");
      // 🔥 OPTION 2: FALLBACK - GROQ (FAST, FREE TIER)
      const groqResponse = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are a WhatsApp assistant for home loans. Reply briefly and professionally."
          },
          { role: "user", content: text }
        ],
        max_tokens: 150
      }, {
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }
      });
      reply = groqResponse.data.choices[0].message.content;
    }

    // SEND REPLY TO WHATSAPP
    await axios.post(
      `https://graph.facebook.com/v20.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        text: { body: reply }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("Reply sent:", reply);
    res.sendStatus(200);
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
    res.sendStatus(200);  // Always 200 to WhatsApp, even on errors
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
