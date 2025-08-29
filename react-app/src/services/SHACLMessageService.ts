/**
 * Service to handle SHACL message processing with language support
 */
export interface LocalizedMessage {
  text: string;
  language?: string;
}

export class SHACLMessageService {
  /**
   * Parse SHACL messages with language tags
   */
  static parseMessages(messageText: string): LocalizedMessage[] {
    const messages: LocalizedMessage[] = [];
    
    // Pattern to match messages with language tags: "message text"@en
    const messagePattern = /"([^"]+)"(?:@([a-z]{2}))?/g;
    let match;
    
    while ((match = messagePattern.exec(messageText)) !== null) {
      messages.push({
        text: match[1],
        language: match[2] || undefined
      });
    }
    
    // If no pattern matches, try to parse as plain text
    if (messages.length === 0) {
      // Remove quotes if present
      const cleanText = messageText.replace(/^"|"$/g, '');
      if (cleanText.trim()) {
        messages.push({ text: cleanText.trim() });
      }
    }
    
    return messages;
  }

  /**
   * Filter messages by language preference
   */
  static filterMessagesByLanguage(
    messages: LocalizedMessage[], 
    preferredLanguage: string = 'en'
  ): LocalizedMessage[] {
    // First, try to find messages in the preferred language
    const preferredMessages = messages.filter(msg => msg.language === preferredLanguage);
    
    if (preferredMessages.length > 0) {
      return preferredMessages;
    }
    
    // If no messages in preferred language, try default/no language
    const defaultMessages = messages.filter(msg => !msg.language);
    
    if (defaultMessages.length > 0) {
      return defaultMessages;
    }
    
    // If still no messages, return all messages
    return messages;
  }

  /**
   * Convert URL strings to clickable links
   */
  static processURLsInText(text: string): { 
    text: string; 
    hasUrls: boolean;
    urls: string[];
  } {
    const urlPattern = /(https?:\/\/[^\s,]+)/g;
    const urls: string[] = [];
    let hasUrls = false;
    
    const processedText = text.replace(urlPattern, (match) => {
      urls.push(match);
      hasUrls = true;
      return `<URL:${match}>`;
    });
    
    return {
      text: processedText,
      hasUrls,
      urls
    };
  }

  /**
   * Format SHACL messages for TTL export with proper language tags
   */
  static formatMessagesForTTL(messages: LocalizedMessage[]): string {
    return messages
      .map(msg => {
        const languageTag = msg.language ? `@${msg.language}` : '';
        const escapedText = msg.text.replace(/"/g, '\\"');
        return `"${escapedText}"${languageTag}`;
      })
      .join(', ');
  }

  /**
   * Detect language of text (simple heuristic)
   */
  static detectLanguage(text: string): string | undefined {
    // Simple heuristics for Spanish vs English
    const spanishIndicators = [
      'debe', 'debería', 'el ', 'la ', 'los ', 'las ', 'un ', 'una ', 'por favor',
      'descripción', 'información', 'período', 'temporal', 'mediante'
    ];
    
    const englishIndicators = [
      'should', 'must', 'the ', 'and ', 'or ', 'please', 'description', 
      'information', 'period', 'temporal', 'using'
    ];
    
    const lowerText = text.toLowerCase();
    
    let spanishScore = 0;
    let englishScore = 0;
    
    spanishIndicators.forEach(indicator => {
      if (lowerText.includes(indicator)) spanishScore++;
    });
    
    englishIndicators.forEach(indicator => {
      if (lowerText.includes(indicator)) englishScore++;
    });
    
    if (spanishScore > englishScore) return 'es';
    if (englishScore > spanishScore) return 'en';
    
    return undefined; // Cannot determine
  }

  /**
   * Parse and enhance SHACL violation messages from TTL
   */
  static enhanceViolationMessages(violation: any): {
    messages: LocalizedMessage[];
    formattedMessages: string[];
  } {
    let messages: LocalizedMessage[] = [];
    
    if (Array.isArray(violation.message)) {
      // Process each message in the array
      violation.message.forEach((msg: string) => {
        const parsed = this.parseMessages(msg);
        messages.push(...parsed);
      });
    } else if (typeof violation.message === 'string') {
      messages = this.parseMessages(violation.message);
    }
    
    // If no language detected, try to detect it
    messages = messages.map(msg => {
      if (!msg.language) {
        msg.language = this.detectLanguage(msg.text);
      }
      return msg;
    });
    
    const formattedMessages = messages.map(msg => {
      const processed = this.processURLsInText(msg.text);
      return processed.text;
    });
    
    return {
      messages,
      formattedMessages
    };
  }
}