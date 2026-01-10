function parseMessage(body) {
  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message || !message.text) return null;

    return {
      from: message.from,
      text: message.text.body
    };
  } catch {
    return null;
  }
}

module.exports = { parseMessage };
