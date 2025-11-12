# Email Services Backend - Production Ready

A robust, scalable email service backend built with NestJS, supporting multiple email providers with queue management, webhooks, templates, and analytics.

## 🚀 Features

- **Multi-Provider Support**: Gmail, Outlook, SendGrid, AWS SES, Mailgun, SMTP
- **Strategy Pattern**: Easily switch between providers or add new ones
- **Async Queue Processing**: BullMQ + Redis for reliable email delivery
- **Template Engine**: Handlebars-based dynamic email templates
- **Webhook Tracking**: Real-time delivery, open, and click tracking
- **Quota Management**: Per-account daily/hourly limits
- **Analytics Dashboard**: Track open rates, click rates, bounce rates
- **Security**: AES-256-GCM encryption for credentials, JWT auth ready
- **Rate Limiting**: Built-in throttling protection
- **Docker Support**: Easy deployment with docker-compose

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- npm or yarn

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd email-services-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment variables

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=email_services

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Encryption (IMPORTANT: Change these in production!)
ENCRYPTION_KEY=your-32-character-encryption-key
JWT_SECRET=your-super-secret-jwt-key

# Provider API Keys (configure as needed)
GMAIL_CLIENT_ID=your-gmail-client-id
GMAIL_CLIENT_SECRET=your-gmail-client-secret
SENDGRID_API_KEY=your-sendgrid-api-key
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
MAILGUN_API_KEY=your-mailgun-api-key
```

### 4. Start infrastructure with Docker

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- PgAdmin on port 5050 (admin@admin.com / admin)
- Redis Commander on port 8081

### 5. Run database migrations

```bash
npm run migration:run
```

### 6. Start the application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

Application will be available at: `http://localhost:3000/api/v1`

## 📁 Project Structure

```
src/
├── config/           # Configuration files
├── entities/         # TypeORM entities
├── providers/        # Email provider implementations
│   ├── base/        # Base interfaces
│   ├── gmail/       # Gmail provider
│   ├── outlook/     # Outlook provider
│   ├── sendgrid/    # SendGrid provider
│   ├── ses/         # AWS SES provider
│   ├── mailgun/     # Mailgun provider
│   └── smtp/        # SMTP fallback
├── services/         # Business logic
├── controllers/      # REST API endpoints
├── queues/          # BullMQ queue & processors
├── dto/             # Data transfer objects
├── utils/           # Utilities (encryption, validation, etc.)
└── middlewares/     # Express middlewares
```

## 🔌 API Endpoints

### Email Management

```http
POST   /api/v1/emails/send                    # Send email
POST   /api/v1/emails/send-template           # Send templated email
GET    /api/v1/emails/queue/:queueId          # Get queue status
DELETE /api/v1/emails/queue/:queueId/cancel   # Cancel queued email
```

### Template Management

```http
POST   /api/v1/templates                      # Create template
GET    /api/v1/templates/:id                  # Get template
GET    /api/v1/templates/account/:accountId   # List account templates
PUT    /api/v1/templates/:id                  # Update template
DELETE /api/v1/templates/:id                  # Delete template
POST   /api/v1/templates/:id/render           # Test render template
```

### Account Management

```http
POST   /api/v1/accounts                       # Create email account
GET    /api/v1/accounts/:id                   # Get account
GET    /api/v1/accounts/user/:userId          # List user accounts
PUT    /api/v1/accounts/:id                   # Update account
DELETE /api/v1/accounts/:id                   # Delete account
POST   /api/v1/accounts/:id/verify            # Verify credentials
```

### Webhooks

```http
POST   /api/v1/webhooks/sendgrid              # SendGrid webhook
POST   /api/v1/webhooks/ses                   # AWS SES webhook
POST   /api/v1/webhooks/mailgun               # Mailgun webhook
POST   /api/v1/webhooks/gmail                 # Gmail webhook
POST   /api/v1/webhooks/outlook               # Outlook webhook
GET    /api/v1/webhooks/email/:emailLogId     # Get email webhooks
```

### Analytics

```http
GET    /api/v1/analytics/account/:accountId                # Get analytics
GET    /api/v1/analytics/account/:accountId/period/:period # Period analytics
GET    /api/v1/analytics/queue-stats                       # Queue statistics
GET    /api/v1/analytics/account/:accountId/top-templates  # Top templates
```

## 📧 Usage Examples

### 1. Create Email Account

```bash
curl -X POST http://localhost:3000/api/v1/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "provider": "sendgrid",
    "email": "sender@example.com",
    "displayName": "My Service",
    "credentials": {
      "apiKey": "SG.xxx"
    }
  }'
```

### 2. Send Email

```bash
curl -X POST http://localhost:3000/api/v1/emails/send \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "account-id",
    "to": ["recipient@example.com"],
    "subject": "Hello from Email Service",
    "htmlBody": "<h1>Hello!</h1><p>This is a test email.</p>",
    "textBody": "Hello! This is a test email.",
    "priority": "normal"
  }'
```

### 3. Create Template

```bash
curl -X POST http://localhost:3000/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "account-id",
    "name": "Welcome Email",
    "subject": "Welcome {{name}}!",
    "htmlBody": "<h1>Welcome {{name}}!</h1><p>Your account at {{company}} is ready.</p>",
    "variables": ["name", "company"]
  }'
```

### 4. Send Template Email

```bash
curl -X POST http://localhost:3000/api/v1/emails/send-template \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "account-id",
    "templateId": "template-id",
    "to": ["user@example.com"],
    "variables": {
      "name": "John Doe",
      "company": "Acme Inc"
    }
  }'
```

## 🔧 Configuration

### Email Providers

#### Gmail (OAuth2)
1. Create project in Google Cloud Console
2. Enable Gmail API
3. Create OAuth2 credentials
4. Set redirect URI: `http://localhost:3000/api/v1/auth/gmail/callback`

#### SendGrid
1. Sign up at sendgrid.com
2. Create API key
3. Add to `.env`: `SENDGRID_API_KEY`

#### AWS SES
1. Create AWS account
2. Verify email domain
3. Create IAM user with SES permissions
4. Add credentials to `.env`

#### Mailgun
1. Sign up at mailgun.com
2. Verify domain
3. Get API key
4. Add to `.env`

## 📊 Database Schema

### Core Tables
- `email_accounts` - Email provider accounts
- `email_templates` - Reusable email templates
- `email_queue` - Pending/processing emails
- `email_logs` - Sent email records
- `email_webhooks` - Delivery event tracking
- `email_attachments` - File attachments

## 🔐 Security

- **Credential Encryption**: AES-256-GCM for storing provider credentials
- **Environment Variables**: Sensitive data in `.env` (never committed)
- **Rate Limiting**: 100 requests per minute per IP
- **Webhook Verification**: Signature validation for all webhooks
- **Input Validation**: class-validator for all DTOs
- **SQL Injection Prevention**: TypeORM parameterized queries

## 🚀 Deployment

### Docker Production

```bash
# Build image
docker build -t email-service:latest .

# Run with docker-compose
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_SYNCHRONIZE=false
DATABASE_LOGGING=false
LOG_LEVEL=error
```

## 📈 Monitoring

### Queue Statistics

```bash
curl http://localhost:3000/api/v1/analytics/queue-stats
```

Returns:
```json
{
  "pending": 5,
  "processing": 2,
  "sent": 1234,
  "failed": 3,
  "cancelled": 1
}
```

### Email Analytics

```bash
curl http://localhost:3000/api/v1/analytics/account/account-id/period/week
```

Returns:
```json
{
  "totalSent": 1000,
  "totalDelivered": 990,
  "totalOpened": 350,
  "totalClicked": 120,
  "deliveryRate": 99.0,
  "openRate": 35.35,
  "clickRate": 34.29,
  "bounceRate": 1.0
}
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 🆘 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review API examples above

## 🎯 Roadmap

- [ ] OAuth2 authentication flow for Gmail/Outlook
- [ ] Attachment upload to S3/CloudFlare R2
- [ ] Email scheduling with cron
- [ ] A/B testing for templates
- [ ] Advanced analytics dashboard
- [ ] Multi-tenancy support
- [ ] GraphQL API
- [ ] Real-time notifications via WebSocket

---

Built with ❤️ using NestJS, TypeORM, BullMQ, and PostgreSQL
