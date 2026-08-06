/** Normalize login/signup email: trim whitespace and lowercase. */
function normalizeEmail(email) {
  if (email == null) return '';
  return String(email).trim().toLowerCase();
}

/** Trim accidental leading/trailing spaces from password input. */
function normalizePassword(password) {
  if (password == null) return '';
  return String(password).trim();
}

module.exports = { normalizeEmail, normalizePassword };
