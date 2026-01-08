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
    return formatted.length >= 12 && formatted.length <= 15;
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
