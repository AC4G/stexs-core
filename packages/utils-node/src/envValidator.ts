import { z, type ZodTypeAny } from 'zod';
import { createConsoleLogger } from './loggers/consoleLogger';
import type { Logger } from 'winston';

export class EnvValidator {
  private missingEnvVars: string[] = [];
  logger: Logger;

  constructor(serviceName: string) {
    this.logger = createConsoleLogger(serviceName, 'warn', 'prod');
  }

  checkEnvVarExists(varName: string): void {
    if (process.env[varName] !== undefined) return;
    this.logger.error(`Missing environment variable: ${varName}.`);
    this.missingEnvVars.push(varName);
  }

  withDefaultString<T extends ZodTypeAny>(
    schema: T,
    defaultValue: string | undefined,
    varName: string
  ): z.ZodDefault<z.ZodEffects<T, string, unknown>> {
    this.checkEnvVarExists(varName);

    const transformed = schema.transform((val: unknown) => {
      if (typeof val !== 'string') {
        this.logger.error(`${varName} invalid type (${typeof val}). Using default: "${defaultValue}"`);
        return defaultValue!;
      }
      if (val.trim() === '') {
        this.logger.warn(`${varName} empty. Using default: "${defaultValue}"`);
        return defaultValue!;
      }
      return val;
    });

    if (defaultValue === undefined) {
      return transformed as any;
    }

    return transformed.default(defaultValue as any);
  }

  withDefaultNumber(schema: z.ZodNumber, defaultValue: number, varName: string) {
    this.checkEnvVarExists(varName);
    return schema
      .transform((val: unknown) => {
        if (typeof val === 'number' && !Number.isNaN(val)) return val;
        this.logger.error(`${varName} invalid number (${val}). Using default ${defaultValue}`);
        return defaultValue;
      })
      .default(defaultValue);
  }

  withDefaultBoolean(defaultValue: boolean, varName: string) {
    this.checkEnvVarExists(varName);
    return z.preprocess((v) =>
      typeof v === 'string' ?
        ['true','1','yes','on'].includes(v.toLowerCase()) :
        Boolean(v),
      z.boolean()
    ).default(defaultValue);
  }

  getMissingEnvVars(): string[] {
    return [...this.missingEnvVars];
  }
}
