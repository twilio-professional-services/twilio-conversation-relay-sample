/**
 * Phone Number Validator
 * Validates E.164 format phone numbers for Twilio
 */

export class PhoneValidator {
  // E.164 format: +[country code][number]
  // Example: +15551234567
  private static readonly E164_REGEX = /^\+[1-9]\d{1,14}$/;

  /**
   * Checks if a phone number is in valid E.164 format
   * @param phone Phone number to validate
   * @returns true if valid, false otherwise
   */
  static isValidE164(phone: string): boolean {
    if (!phone) return false;
    return this.E164_REGEX.test(phone);
  }

  /**
   * Validates a phone number and returns detailed result
   * @param phone Phone number to validate
   * @returns Validation result with error message if invalid
   */
  static validate(phone: string): { valid: boolean; error?: string } {
    if (!phone) {
      return {
        valid: false,
        error: 'Phone number is required'
      };
    }

    if (!phone.startsWith('+')) {
      return {
        valid: false,
        error: 'Phone number must start with + (E.164 format required)'
      };
    }

    if (!this.isValidE164(phone)) {
      return {
        valid: false,
        error: 'Phone number must be in E.164 format (e.g., +15551234567)'
      };
    }

    return { valid: true };
  }

  /**
   * Formats a phone number for display
   * @param phone Phone number in E.164 format
   * @returns Formatted phone number
   */
  static format(phone: string): string {
    // Remove + prefix for formatting
    const digits = phone.replace(/^\+/, '');

    // US/Canada numbers (country code 1)
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits[0]} (${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7)}`;
    }

    // International numbers - just return as-is
    return phone;
  }
}
