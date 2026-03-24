require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: "mail.agoraargentina.ar", // Host de cPanel
  port: 465,
  secure: true, 
  auth: {
    user: "info@agoraargentina.ar",
    pass: '@gora$$arg', 
  },
  tls: {
    // Esencial para servidores de hosting compartido
    rejectUnauthorized: false 
  }
});

console.log("Probando conexión con el servidor de agoraargentina.ar...");

transporter.verify()
  .then(() => console.log("🚀 ¡CONEXIÓN EXITOSA! El servidor de cPanel respondió correctamente."))
  .catch((err) => {
    console.error("❌ Error de conexión:", err.message);
    console.log("\nSi falla, intenta cambiar el host a: agoraargentina.ar (sin el 'mail.')");
  });