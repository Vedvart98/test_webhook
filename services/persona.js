function getPersona(text) {
  const lower = text.toLowerCase();

  if (lower.includes('sir') || lower.includes('loan') || lower.includes('interest'))
    return 'professional_customer';

  if (lower.includes('bhai') || lower.includes('yaar'))
    return 'friend';

  return 'neutral';
}

module.exports = { getPersona };
