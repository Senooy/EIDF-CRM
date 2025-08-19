import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const router = Router();

// Load environment variables
dotenv.config({ path: '.env.server' });

// Settings file path
const SETTINGS_FILE = path.join(process.cwd(), 'data', 'email-settings.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(SETTINGS_FILE))) {
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
}

// Load settings from file or use defaults from environment
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  
  // Return defaults from environment
  return {
    defaultFromName: process.env.DEFAULT_FROM_NAME || 'EIDF CRM',
    defaultFromEmail: process.env.DEFAULT_FROM_EMAIL || 'noreply@eidf-crm.fr',
    smtpHost: process.env.SMTP_HOST || 'localhost',
    smtpPort: process.env.SMTP_PORT || '25',
    trackingBaseUrl: process.env.TRACKING_BASE_URL || 'https://dashboard.eidf-crm.fr'
  };
}

// Save settings to file
function saveSettings(settings: any) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

// Get email settings
router.get('/settings/email', (req: Request, res: Response) => {
  const settings = loadSettings();
  res.json(settings);
});

// Update email settings
router.put('/settings/email', (req: Request, res: Response) => {
  const settings = {
    ...loadSettings(),
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  
  if (saveSettings(settings)) {
    // Update environment variables in memory
    if (settings.defaultFromName) {
      process.env.DEFAULT_FROM_NAME = settings.defaultFromName;
    }
    if (settings.defaultFromEmail) {
      process.env.DEFAULT_FROM_EMAIL = settings.defaultFromEmail;
    }
    if (settings.smtpHost) {
      process.env.SMTP_HOST = settings.smtpHost;
    }
    if (settings.smtpPort) {
      process.env.SMTP_PORT = settings.smtpPort;
    }
    if (settings.trackingBaseUrl) {
      process.env.TRACKING_BASE_URL = settings.trackingBaseUrl;
    }
    
    res.json({ message: 'Settings updated successfully', settings });
  } else {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

export default router;