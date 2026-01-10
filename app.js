// // // Import Express.js
// // const express = require('express');

// // // Create an Express app
// // const app = express();

// // // Middleware to parse JSON bodies
// // app.use(express.json());

// // // Set port and verify_token
// // const port = process.env.PORT || 3000;
// // const verifyToken = process.env.VERIFY_TOKEN;

// // // Route for GET requests
// // app.get('/', (req, res) => {
// //   const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

// //   if (mode === 'subscribe' && token === verifyToken) {
// //     console.log('WEBHOOK VERIFIED');
// //     res.status(200).send(challenge);
// //   } else {
// //     res.status(403).end();
// //   }
// // });

// // // Route for POST requests
// // app.post('/', (req, res) => {
// //   const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
// //   console.log(`\n\nWebhook received ${timestamp}\n`);
// //   console.log(JSON.stringify(req.body, null, 2));
// //   res.status(200).end();
// // });

// // // Start the server
// // app.listen(port, () => {
// //   console.log(`\nListening on port ${port}\n`);
// // });


// require('dotenv').config();
// const express = require('express');
// const webhookRoutes = require('./routes/webhook');

// const app = express();
// app.use(express.json());

// app.use('/webhook', webhookRoutes);

// app.listen(process.env.PORT, () => {
//   console.log(`Server running on port ${process.env.PORT}`);
// });

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
  console.log("Webhook received");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message || !message.text) {
      return res.sendStatus(200);
    }

    const from = message.from;
    const text = message.text.body;

    console.log("User:", from);
    console.log("Message:", text);

    // 🔥 SEND TEST REPLY
    // await axios.post(
    //   `${process.env.WHATSAPP_API_URL}/${process.env.PHONE_NUMBER_ID}/messages`,
    //   {
    //     messaging_product: "whatsapp",
    //     to: from,
    //     text: { body: "✅ Bot is working! This is a test reply." }
    //   },
    //   {
    //     headers: {
    //       Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    //       "Content-Type": "application/json"
    //     }
    //   }
    // );
    // 🔥 CALL HUGGING FACE LLaMA 3
    const aiResponse = await axios.post(
      "https://router.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct",
      {
        inputs: `
You are a helpful, professional WhatsApp assistant for a mortgage and home loan company.
Reply in English, Hindi, or Hinglish depending on the user's message.

User: ${text}
Assistant:
`,
        parameters: {
          max_new_tokens: 200,
          temperature: 0.6
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    // Extract text safely
    const reply =
      aiResponse.data?.[0]?.generated_text?.split("Assistant:").pop()?.trim() ||
      "Thank you for your message! Our team will contact you shortly.";

    // 🔥 SEND AI REPLY TO WHATSAPP
    await axios.post(
      `${process.env.WHATSAPP_API_URL}/${process.env.PHONE_NUMBER_ID}/messages`,
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

    res.sendStatus(200);
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
