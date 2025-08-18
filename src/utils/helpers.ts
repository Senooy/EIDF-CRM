/**
 * Generate a random number between min and max (inclusive)
 */
export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if current time is within business hours (9-18h, Mon-Fri)
 */
export function isBusinessHours(date: Date = new Date()): boolean {
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const hour = date.getHours();
  
  // Monday to Friday (1-5) and between 9-18h
  return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
}

/**
 * Get next business hour
 */
export function getNextBusinessHour(date: Date = new Date()): Date {
  const next = new Date(date);
  
  // If weekend, move to Monday 9am
  if (next.getDay() === 0) { // Sunday
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0);
  } else if (next.getDay() === 6) { // Saturday
    next.setDate(next.getDate() + 2);
    next.setHours(9, 0, 0, 0);
  } else if (next.getHours() >= 18) { // After hours on weekday
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0);
  } else if (next.getHours() < 9) { // Before hours on weekday
    next.setHours(9, 0, 0, 0);
  }
  
  return next;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Extract domain from email
 */
export function extractDomain(email: string): string {
  return email.split('@')[1];
}

/**
 * Clean email address (remove dots, plus signs, etc.)
 */
export function cleanEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Generate a unique ID for tracking
 */
export function generateTrackingId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Parse user agent for device info
 */
export function parseUserAgent(userAgent: string): {
  browser?: string;
  os?: string;
  device?: string;
} {
  const result: any = {};
  
  // Browser detection
  if (userAgent.includes('Chrome')) result.browser = 'Chrome';
  else if (userAgent.includes('Firefox')) result.browser = 'Firefox';
  else if (userAgent.includes('Safari')) result.browser = 'Safari';
  else if (userAgent.includes('Edge')) result.browser = 'Edge';
  
  // OS detection
  if (userAgent.includes('Windows')) result.os = 'Windows';
  else if (userAgent.includes('Macintosh')) result.os = 'macOS';
  else if (userAgent.includes('Linux')) result.os = 'Linux';
  else if (userAgent.includes('iPhone')) result.os = 'iOS';
  else if (userAgent.includes('Android')) result.os = 'Android';
  
  // Device detection
  if (userAgent.includes('Mobile')) result.device = 'Mobile';
  else if (userAgent.includes('Tablet')) result.device = 'Tablet';
  else result.device = 'Desktop';
  
  return result;
}

/**
 * Format duration in human readable format
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Calculate percentage with precision
 */
export function percentage(value: number, total: number, precision: number = 2): number {
  if (total === 0) return 0;
  return Number(((value / total) * 100).toFixed(precision));
}

/**
 * Truncate text to max length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Generate variations of text to avoid spam filters
 */
export function generateTextVariations(text: string): string[] {
  const variations = [text];
  
  // Add punctuation variations
  variations.push(text.replace(/\./g, ' .'));
  variations.push(text.replace(/!/g, ' !'));
  variations.push(text.replace(/\?/g, ' ?'));
  
  // Add space variations
  variations.push(text.replace(/\s+/g, '  '));
  
  // Add synonym variations (basic)
  const synonyms: Record<string, string[]> = {
    'excellent': ['formidable', 'remarquable', 'exceptionnel'],
    'rapide': ['véloce', 'prompt', 'instantané'],
    'qualité': ['excellence', 'finition', 'standing'],
    'maintenant': ['immédiatement', 'à présent', 'dès maintenant'],
  };
  
  Object.entries(synonyms).forEach(([word, alternatives]) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    alternatives.forEach(alt => {
      variations.push(text.replace(regex, alt));
    });
  });
  
  return [...new Set(variations)]; // Remove duplicates
}

/**
 * Check if email domain is likely to be spam-filtered
 */
export function isHighRiskDomain(email: string): boolean {
  const domain = extractDomain(email);
  const highRiskDomains = [
    'tempmail.org',
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
    'yopmail.com'
  ];
  
  return highRiskDomains.includes(domain.toLowerCase());
}

/**
 * Generate a realistic delay based on human typing patterns
 */
export function generateHumanDelay(baseDelay: number = 3000): number {
  // Add natural variation (±50%)
  const variation = baseDelay * 0.5;
  const randomVariation = (Math.random() - 0.5) * 2 * variation;
  
  // Ensure minimum delay
  return Math.max(1000, baseDelay + randomVariation);
}