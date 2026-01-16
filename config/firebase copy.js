const admin = require('firebase-admin');
const serviceAccount = require("../serviceAccount.json"); 

if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
}

// IMPORTANTE: Aquí obtenemos la instancia de Firestore
const db = admin.firestore();

// Exportamos la instancia 'db' directamente
module.exports = db;