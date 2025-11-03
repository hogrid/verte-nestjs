/**
 * Number Helper
 * Utility functions for phone number formatting
 * Compatible with Laravel NumberHelper::formatNumberStatic()
 */
export class NumberHelper {
  /**
   * Format phone number to Brazilian standard with country code
   * Compatible with Laravel: app/Helpers/NumberHelper.php::formatNumberStatic()
   *
   * Rules:
   * 1. Remove spaces, hyphens, parentheses, and + sign
   * 2. If already 12 or 13 digits, return as is
   * 3. Add country code "55" if not present
   * 4. Remove leading zero if exists
   * 5. Remove all non-digits
   *
   * Examples:
   * - "(11) 98765-4321" → "5511987654321"
   * - "11987654321" → "5511987654321"
   * - "+55 11 98765-4321" → "5511987654321"
   * - "5511987654321" → "5511987654321"
   */
  static formatNumber(number: string): string {
    if (!number) {
      return '';
    }

    // Remove spaces, hyphens, parentheses and +
    let numberData = number.replace(/[ \-()+ ]/g, '');

    // If already has 12 or 13 digits, return
    if (numberData.length === 12 || numberData.length === 13) {
      return numberData;
    }

    // Add country code "55" if not present
    if (!numberData.startsWith('55')) {
      // Remove leading zero if exists
      if (numberData[0] === '0') {
        numberData = numberData.substring(1);
      }
      numberData = '55' + numberData;
    }

    // Remove all non-digits
    numberData = numberData.replace(/\D/g, '');

    return numberData;
  }
}
