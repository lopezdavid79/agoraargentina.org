const admin = require('firebase-admin');

// No requerimos el archivo JSON, usamos process.env
if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // PASO CLAVE: Reemplazamos los saltos de línea literales (\n) por reales
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      })
    });
}

const db = admin.firestore();

module.exports = db;