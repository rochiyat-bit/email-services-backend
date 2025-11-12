import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TemplateService } from '../services/template.service';
import { CreateTemplateDto, UpdateTemplateDto } from '../dto';

@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post()
  async createTemplate(@Body() dto: CreateTemplateDto) {
    return this.templateService.createTemplate(dto);
  }

  @Get(':id')
  async getTemplate(@Param('id') id: string) {
    return this.templateService.getTemplate(id);
  }

  @Get('account/:accountId')
  async getTemplatesByAccount(@Param('accountId') accountId: string) {
    return this.templateService.getTemplatesByAccount(accountId);
  }

  @Put(':id')
  async updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templateService.updateTemplate(id, dto);
  }

  @Delete(':id')
  async deleteTemplate(@Param('id') id: string) {
    await this.templateService.deleteTemplate(id);
    return { message: 'Template deleted successfully' };
  }

  @Post(':id/render')
  async renderTemplate(
    @Param('id') id: string,
    @Body() body: { variables: Record<string, any> },
  ) {
    return this.templateService.renderTemplate(id, body.variables);
  }
}
