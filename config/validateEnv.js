function validateEnv() {
  const requiredVars = [
    'SESSION_SECRET',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'EMAIL_USER',
    'EMAIL_PASS',
  ];

  let missing = false;

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.error('[validateEnv] Missing required environment variable: ' + varName);
      missing = true;
    }
  }

  if (missing) {
    process.exit(1);
  }
}

module.exports = { validateEnv };
