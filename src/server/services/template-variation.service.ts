import { generateTextVariations } from '@/utils/helpers';
import { logger } from '@/lib/logger';

interface EmailVariation {
  subject: string;
  htmlBody: string;
  plainTextBody?: string;
}

class TemplateVariationService {
  private subjectVariations: Record<string, string[]> = {
    // Salutations alternatives
    'Bonjour': ['Salut', 'Bonsoir', 'Hello', 'Coucou', 'Bonne journée'],
    'Madame': ['Mme', 'Madame,', 'Chère Madame'],
    'Monsieur': ['M.', 'Monsieur,', 'Cher Monsieur'],
    
    // Mots d'appel à l'action
    'Découvrez': ['Explorez', 'Trouvez', 'Parcourez', 'Consultez'],
    'Profitez': ['Bénéficiez', 'Tirez parti', 'Saisissez'],
    'Nouveau': ['Récent', 'Dernier', 'Inédit', 'Frais'],
    'Offre': ['Promotion', 'Deal', 'Opportunité', 'Avantage'],
    'Gratuit': ['Libre', 'Sans frais', 'Offert', 'Cadeau'],
    
    // Urgence
    'Urgent': ['Important', 'Pressant', 'Critique'],
    'Limité': ['Restreint', 'Exclusif', 'Rare'],
    'Maintenant': ['Immédiatement', 'Tout de suite', 'Dès maintenant'],
    
    // Emotions
    'Incroyable': ['Fantastique', 'Extraordinaire', 'Magnifique', 'Superbe'],
    'Parfait': ['Idéal', 'Excellent', 'Optimal', 'Impeccable']
  };

  private htmlVariations: Record<string, string[]> = {
    // Ponctuation
    '!': [' !', '&nbsp;!'],
    '?': [' ?', '&nbsp;?'],
    ':': [' :', '&nbsp;:'],
    
    // Espacements
    ' ': ['&nbsp;', ' &nbsp;'],
    
    // Formatage
    '<strong>': ['<b>', '<span style="font-weight: bold;">'],
    '</strong>': ['</b>', '</span>'],
    '<em>': ['<i>', '<span style="font-style: italic;">'],
    '</em>': ['</i>', '</span>']
  };

  /**
   * Génère des variations d'un email pour éviter les filtres anti-spam
   */
  generateEmailVariations(
    originalSubject: string,
    originalHtmlBody: string,
    originalPlainTextBody?: string,
    maxVariations: number = 5
  ): EmailVariation[] {
    const variations: EmailVariation[] = [];
    
    // Toujours inclure l'original
    variations.push({
      subject: originalSubject,
      htmlBody: originalHtmlBody,
      plainTextBody: originalPlainTextBody
    });

    // Générer des variations
    for (let i = 1; i < maxVariations; i++) {
      const subjectVariation = this.varySubject(originalSubject, i);
      const htmlBodyVariation = this.varyHtmlContent(originalHtmlBody, i);
      const plainTextVariation = originalPlainTextBody 
        ? this.varyPlainTextContent(originalPlainTextBody, i)
        : undefined;

      variations.push({
        subject: subjectVariation,
        htmlBody: htmlBodyVariation,
        plainTextBody: plainTextVariation
      });
    }

    logger.debug('Generated email variations', {
      originalSubject,
      variationCount: variations.length
    });

    return variations;
  }

  /**
   * Varie le sujet de l'email
   */
  private varySubject(subject: string, variationIndex: number): string {
    let varied = subject;

    // Appliquer différentes stratégies selon l'index
    switch (variationIndex % 4) {
      case 1:
        // Remplacer des mots clés
        varied = this.replaceKeywords(varied, this.subjectVariations);
        break;
      
      case 2:
        // Ajouter des espaces avant la ponctuation
        varied = varied.replace(/([!?:])/g, ' $1');
        break;
      
      case 3:
        // Varier la casse (première lettre de chaque mot)
        varied = varied.replace(/\b\w/g, (char, index) => 
          index === 0 || Math.random() > 0.3 ? char.toUpperCase() : char.toLowerCase()
        );
        break;
      
      default:
        // Ajouter des caractères invisibles
        varied = this.addInvisibleChars(varied);
        break;
    }

    return varied;
  }

  /**
   * Varie le contenu HTML
   */
  private varyHtmlContent(html: string, variationIndex: number): string {
    let varied = html;

    // Appliquer différentes stratégies
    switch (variationIndex % 5) {
      case 1:
        // Remplacer des mots dans le texte
        varied = this.replaceKeywords(varied, this.subjectVariations);
        break;
      
      case 2:
        // Varier les balises HTML
        Object.entries(this.htmlVariations).forEach(([original, alternatives]) => {
          if (varied.includes(original)) {
            const randomAlt = alternatives[Math.floor(Math.random() * alternatives.length)];
            varied = varied.replace(new RegExp(original, 'g'), randomAlt);
          }
        });
        break;
      
      case 3:
        // Ajouter des espaces non-cassables aléatoirement
        varied = varied.replace(/\s+/g, (match) => 
          Math.random() > 0.7 ? match + '&nbsp;' : match
        );
        break;
      
      case 4:
        // Varier l'ordre des attributs CSS
        varied = varied.replace(/style="([^"]+)"/g, (match, styles) => {
          const styleArray = styles.split(';').filter(s => s.trim());
          const shuffled = this.shuffleArray([...styleArray]);
          return `style="${shuffled.join(';')}"`;
        });
        break;
      
      default:
        // Ajouter des commentaires HTML invisibles
        varied = this.addHtmlComments(varied);
        break;
    }

    return varied;
  }

  /**
   * Varie le contenu texte brut
   */
  private varyPlainTextContent(plainText: string, variationIndex: number): string {
    let varied = plainText;

    switch (variationIndex % 3) {
      case 1:
        // Remplacer des mots clés
        varied = this.replaceKeywords(varied, this.subjectVariations);
        break;
      
      case 2:
        // Varier les espaces
        varied = varied.replace(/\s+/g, (match) => 
          Math.random() > 0.8 ? match + ' ' : match
        );
        break;
      
      default:
        // Varier la ponctuation
        varied = varied.replace(/([.!?])/g, (match) => 
          Math.random() > 0.7 ? match + ' ' : match
        );
        break;
    }

    return varied;
  }

  /**
   * Remplace des mots-clés par leurs synonymes
   */
  private replaceKeywords(text: string, variations: Record<string, string[]>): string {
    let result = text;

    Object.entries(variations).forEach(([keyword, alternatives]) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(result) && Math.random() > 0.5) {
        const randomAlt = alternatives[Math.floor(Math.random() * alternatives.length)];
        result = result.replace(regex, randomAlt);
      }
    });

    return result;
  }

  /**
   * Ajoute des caractères invisibles pour varier le contenu
   */
  private addInvisibleChars(text: string): string {
    const invisibleChars = ['\u200B', '\u200C', '\u200D', '\uFEFF']; // Zero-width chars
    
    return text.split('').map((char, index) => {
      if (index > 0 && index % 10 === 0 && Math.random() > 0.8) {
        const randomInvisible = invisibleChars[Math.floor(Math.random() * invisibleChars.length)];
        return char + randomInvisible;
      }
      return char;
    }).join('');
  }

  /**
   * Ajoute des commentaires HTML invisibles
   */
  private addHtmlComments(html: string): string {
    const comments = [
      '<!-- -->',
      '<!-- . -->',
      '<!-- spacing -->',
      '<!-- content -->'
    ];

    // Insérer des commentaires après certaines balises
    return html.replace(/(<\/?(p|div|span|br)[^>]*>)/gi, (match) => {
      if (Math.random() > 0.7) {
        const randomComment = comments[Math.floor(Math.random() * comments.length)];
        return match + randomComment;
      }
      return match;
    });
  }

  /**
   * Mélange un array (Fisher-Yates)
   */
  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Génère des en-têtes variés pour humaniser l'envoi
   */
  generateVariedHeaders(baseHeaders: Record<string, string>): Record<string, string> {
    const headers = { ...baseHeaders };

    // Varier X-Mailer
    const mailers = [
      'Microsoft Outlook 16.0',
      'Apple Mail (2.3445.104.11)',
      'Mozilla Thunderbird 91.0',
      'Evolution 3.44.0',
      'Mailspring 1.9.2'
    ];
    
    if (Math.random() > 0.3) {
      headers['X-Mailer'] = mailers[Math.floor(Math.random() * mailers.length)];
    }

    // Varier User-Agent si présent
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    ];

    if (headers['User-Agent'] && Math.random() > 0.5) {
      headers['User-Agent'] = userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    // Ajouter des en-têtes optionnels parfois
    if (Math.random() > 0.7) {
      headers['X-Priority'] = Math.random() > 0.5 ? '1' : '3';
    }

    if (Math.random() > 0.8) {
      headers['X-MSMail-Priority'] = 'Normal';
    }

    return headers;
  }

  /**
   * Choisit une variation aléatoire pour un email
   */
  getRandomVariation(variations: EmailVariation[]): EmailVariation {
    const randomIndex = Math.floor(Math.random() * variations.length);
    return variations[randomIndex];
  }

  /**
   * Génère des délais variés entre les envois
   */
  generateSendingPattern(recipientCount: number): number[] {
    const delays: number[] = [];
    
    for (let i = 0; i < recipientCount; i++) {
      // Délai de base entre 30 secondes et 5 minutes
      let baseDelay = 30000 + Math.random() * 270000;
      
      // Pauses plus longues tous les 25-50 emails
      if (i > 0 && i % (25 + Math.floor(Math.random() * 25)) === 0) {
        baseDelay += 300000 + Math.random() * 600000; // 5-15 minutes
      }
      
      // Pauses très longues tous les 200-300 emails
      if (i > 0 && i % (200 + Math.floor(Math.random() * 100)) === 0) {
        baseDelay += 1800000 + Math.random() * 1800000; // 30-60 minutes
      }
      
      delays.push(Math.floor(baseDelay));
    }
    
    return delays;
  }
}

export const templateVariationService = new TemplateVariationService();