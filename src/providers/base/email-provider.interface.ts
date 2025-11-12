export interface SendEmailPayload {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlBody: string;
  textBody?: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
  encoding?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface QuotaInfo {
  daily: number;
  hourly: number;
  used: number;
  remaining: number;
  resetAt: Date;
}

export interface WebhookEvent {
  type: string;
  messageId: string;
  timestamp: Date;
  recipient?: string;
  data: Record<string, any>;
}

export interface IEmailProvider {
  /**
   * Get the provider name
   */
  getName(): string;

  /**
   * Send a single email
   */
  sendEmail(payload: SendEmailPayload): Promise<SendEmailResult>;

  /**
   * Send bulk emails (batch processing)
   */
  sendBulkEmail(payloads: SendEmailPayload[]): Promise<SendEmailResult[]>;

  /**
   * Verify provider credentials are valid
   */
  verifyCredentials(): Promise<boolean>;

  /**
   * Get current quota information
   */
  getQuota(): Promise<QuotaInfo>;

  /**
   * Parse webhook payload from provider
   */
  parseWebhook(payload: any): WebhookEvent;

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: any, signature: string): boolean;

  /**
   * Get provider-specific configuration
   */
  getConfig(): Record<string, any>;
}
