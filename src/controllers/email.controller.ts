import { Controller, Post, Get, Body, Param, Query, Delete, UseGuards } from '@nestjs/common';
import { EmailService } from '../services/email.service';
import { SendEmailDto, SendTemplateEmailDto } from '../dto';

@Controller('emails')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  async sendEmail(@Body() dto: SendEmailDto) {
    return this.emailService.sendEmail(dto);
  }

  @Post('send-template')
  async sendTemplateEmail(@Body() dto: SendTemplateEmailDto) {
    return this.emailService.sendTemplateEmail(dto);
  }

  @Get('queue/:queueId')
  async getQueueStatus(@Param('queueId') queueId: string) {
    return this.emailService.getQueueStatus(queueId);
  }

  @Delete('queue/:queueId/cancel')
  async cancelEmail(@Param('queueId') queueId: string) {
    await this.emailService.cancelEmail(queueId);
    return { message: 'Email cancelled successfully' };
  }
}
