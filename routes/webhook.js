const express = require('express');
const router = express.Router();

const { parseMessage } = require('../utils/messageParser');
const { getPersona } = require('../services/persona');
const { generateAIReply } = require('../services/ai');
const { sendWhatsAppMessage } = require('../services/whatsapp');

/* VERIFY WEBHOOK */
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('Webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

/* RECEIVE MESSAGE */
router.post('/', async (req, res) => {
  try {
    const messageData = parseMessage(req.body);
    if (!messageData) return res.sendStatus(200);

    const { from, text } = messageData;

    const persona = getPersona(text);
    const aiReply = await generateAIReply(text, persona);

    await sendWhatsAppMessage(from, aiReply);

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

module.exports = router;
