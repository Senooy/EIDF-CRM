import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Charger les variables d'environnement
dotenv.config({ path: '.env.server' });

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
    console.log('- From:', process.env.DEFAULT_FROM_EMAIL || 'noreply@eidf-crm.fr');
    
    const info = await transporter.sendMail({
      from: '"EIDF CRM" <contact@eidf-crm.fr>',
      to: 'nskhelifi@gmail.com',
      subject: 'Test Email - EIDF CRM Campaigns',
      text: 'Ceci est un email de test envoyé depuis EIDF CRM via Postfix local.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Test Email - EIDF CRM</h1>
          <p>Bonjour,</p>
          <p>Ceci est un email de test envoyé depuis <b>EIDF CRM</b> pour vérifier que le système de campagnes email fonctionne correctement.</p>
          <p>Le système utilise Postfix local pour l'envoi des emails.</p>
          <hr style="border: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Envoyé depuis: contact@eidf-crm.fr<br>
            Serveur: mail.eidf-crm.fr<br>
            Date: ${new Date().toLocaleString('fr-FR')}
          </p>
        </div>
      `
    });

    console.log('✅ Email envoyé avec succès!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('Accepted:', info.accepted);
    console.log('Rejected:', info.rejected);
    
    // Vérifier les logs Postfix
    console.log('\n📋 Vérification des logs Postfix...');
    try {
      const { stdout } = await execAsync('journalctl -u postfix -n 10 --no-pager | grep -E "to=|from=|status=" | tail -5');
      if (stdout) {
        console.log('Derniers emails traités par Postfix:');
        console.log(stdout);
      }
    } catch (err) {
      console.log('Impossible de lire les logs Postfix (permissions insuffisantes)');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Solution: Vérifiez que Postfix est bien démarré:');
      console.log('   sudo systemctl start postfix');
      console.log('   sudo systemctl status postfix');
    }
  }
}

sendTestEmail();