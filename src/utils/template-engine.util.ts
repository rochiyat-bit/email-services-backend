import { Injectable, BadRequestException } from '@nestjs/common';
import * as Handlebars from 'handlebars';

@Injectable()
export class TemplateEngineUtil {
  constructor() {
    this.registerHelpers();
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHelpers() {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date: Date, format: string) => {
      if (!date) return '';
      const d = new Date(date);

      switch (format) {
        case 'short':
          return d.toLocaleDateString();
        case 'long':
          return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        case 'time':
          return d.toLocaleTimeString();
        default:
          return d.toISOString();
      }
    });

    // Uppercase helper
    Handlebars.registerHelper('uppercase', (str: string) => {
      return str?.toUpperCase() || '';
    });

    // Lowercase helper
    Handlebars.registerHelper('lowercase', (str: string) => {
      return str?.toLowerCase() || '';
    });

    // Conditional helper
    Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });

    // Math helper
    Handlebars.registerHelper('add', (a: number, b: number) => {
      return a + b;
    });

    // Default value helper
    Handlebars.registerHelper('default', (value, defaultValue) => {
      return value || defaultValue;
    });
  }

  /**
   * Compile and render a template with variables
   */
  render(template: string, variables: Record<string, any>): string {
    try {
      const compiled = Handlebars.compile(template);
      return compiled(variables);
    } catch (error) {
      throw new BadRequestException(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * Extract variables from a template
   */
  extractVariables(template: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = regex.exec(template)) !== null) {
      // Extract variable name and clean it
      const variable = match[1]
        .trim()
        .replace(/^[#\/]/, '') // Remove # or / from helpers
        .split(/\s+/)[0] // Get first word
        .split('.')[0]; // Get base variable name

      // Skip Handlebars helpers
      if (!this.isHandlebarsHelper(variable)) {
        variables.add(variable);
      }
    }

    return Array.from(variables);
  }

  /**
   * Check if a string is a Handlebars helper
   */
  private isHandlebarsHelper(str: string): boolean {
    const helpers = [
      'if',
      'unless',
      'each',
      'with',
      'formatDate',
      'uppercase',
      'lowercase',
      'ifEquals',
      'add',
      'default',
      'else',
    ];
    return helpers.includes(str);
  }

  /**
   * Validate template syntax
   */
  validateTemplate(template: string): { valid: boolean; error?: string } {
    try {
      Handlebars.compile(template);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Precompile template for better performance
   */
  precompile(template: string): any {
    return Handlebars.precompile(template);
  }
}
