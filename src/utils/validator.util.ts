import { Injectable } from '@nestjs/common';

@Injectable()
export class ValidatorUtil {
  /**
   * Validate email address format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate multiple email addresses
   */
  areValidEmails(emails: string[]): boolean {
    return emails.every((email) => this.isValidEmail(email));
  }

  /**
   * Sanitize email address
   */
  sanitizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Validate URL format
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate file size (in bytes)
   */
  isValidFileSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
    return size > 0 && size <= maxSize;
  }

  /**
   * Validate MIME type
   */
  isValidMimeType(mimeType: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimeType);
  }

  /**
   * Validate date is in the future
   */
  isFutureDate(date: Date): boolean {
    return new Date(date) > new Date();
  }

  /**
   * Sanitize HTML to prevent XSS
   */
  sanitizeHtml(html: string): string {
    // Basic sanitization - in production, use a library like DOMPurify
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/g, '')
      .replace(/on\w+='[^']*'/g, '');
  }

  /**
   * Validate JSON string
   */
  isValidJson(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract domain from email
   */
  extractDomain(email: string): string {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1] : '';
  }

  /**
   * Validate rate limit
   */
  checkRateLimit(used: number, limit: number): boolean {
    return used < limit;
  }
}
