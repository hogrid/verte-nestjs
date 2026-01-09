export class NumberHelper {
  /**
   * Format phone number to a standardized format
   * Removes non-numeric characters and ensures proper country code
   */
  static formatNumber(phone: string | null | undefined): string {
    if (!phone) return '';

    // Remove all non-numeric characters
    let digits = phone.replace(/\D/g, '');

    // If starts with 0, remove it
    if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }

    // If doesn't start with country code (55 for Brazil), add it
    if (!digits.startsWith('55') && digits.length <= 11) {
      digits = '55' + digits;
    }

    return digits;
  }

  /**
   * Validate if phone number is valid
   */
  static isValidPhone(phone: string | null | undefined): boolean {
    if (!phone) return false;
    const formatted = this.formatNumber(phone);
    return this.isValidBrazilianPhone(formatted);
  }

  /**
   * Validate if a phone number is a valid Brazilian phone number
   * Brazilian phone numbers with country code have 12-13 digits:
   * - 55 + DDD (2 digits) + number (8-9 digits)
   * - Example: 5511999999999 (13 digits) or 551199999999 (12 digits)
   */
  static isValidBrazilianPhone(digits: string): boolean {
    if (!digits) return false;

    // Must have between 12 and 13 digits (55 + 10-11 digits)
    const minLength = 12; // 55 + 10 (landline)
    const maxLength = 13; // 55 + 11 (mobile)

    if (digits.length < minLength || digits.length > maxLength) {
      return false;
    }

    // Must start with 55 (Brazil country code)
    if (!digits.startsWith('55')) {
      return false;
    }

    // DDD (area code) must be between 11 and 99
    const areaCode = parseInt(digits.substring(2, 4), 10);
    if (areaCode < 11 || areaCode > 99) {
      return false;
    }

    // Mobile numbers (9 digits after DDD) must start with 9
    if (digits.length === 13) {
      const mobilePrefix = digits.charAt(4);
      if (mobilePrefix !== '9') {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a remoteJid is a valid WhatsApp contact (not a group)
   * Contacts end with @s.whatsapp.net
   * Groups end with @g.us
   */
  static isValidContactJid(jid: string | null | undefined): boolean {
    if (!jid) return false;
    return jid.endsWith('@s.whatsapp.net');
  }

  /**
   * Check if a remoteJid is a WhatsApp group
   */
  static isGroupJid(jid: string | null | undefined): boolean {
    if (!jid) return false;
    return jid.endsWith('@g.us');
  }

  /**
   * Format phone for WhatsApp API (with @s.whatsapp.net)
   */
  static formatForWhatsApp(phone: string): string {
    const digits = this.formatNumber(phone);
    return `${digits}@s.whatsapp.net`;
  }

  /**
   * Extract digits from remoteJid
   */
  static extractFromJid(jid: string): string {
    return jid.replace(/@.*/, '').replace(/\D/g, '');
  }
}
