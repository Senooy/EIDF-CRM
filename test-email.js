const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.server' });

// Configuration SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT) || 25,
  secure: false,
  // Pas d'authentification pour Postfix local
  tls: {
    rejectUnauthorized: false
  }
});

async function sendTestEmail() {
  try {
    console.log('📧 Test d\'envoi d\'email via Postfix...');
    console.log('Configuration SMTP:');
    console.log('- Host:', process.env.SMTP_HOST || 'localhost');
    console.log('- Port:', process.env.SMTP_PORT || 25);
    
    const info = await transporter.sendMail({
      from: process.env.DEFAULT_FROM_EMAIL || 'noreply@eidf-crm.fr',
      to: 'test@example.com', // Email de test
      subject: 'Test Email - EIDF CRM',
      text: 'Ceci est un email de test envoyé depuis EIDF CRM via Postfix.',
      html: '<h1>Test Email</h1><p>Ceci est un email de test envoyé depuis <b>EIDF CRM</b> via Postfix.</p>'
    });

    console.log('✅ Email envoyé avec succès!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    
    // Vérifier les logs Postfix
    console.log('\n📋 Vérification des logs Postfix...');
    const { exec } = require('child_process');
    exec('tail -n 5 /var/log/mail.log 2>/dev/null || journalctl -u postfix -n 5 --no-pager', (error, stdout, stderr) => {
      if (stdout) {
        console.log('Logs Postfix:');
        console.log(stdout);
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi:', error);
  }
}

sendTestEmail();