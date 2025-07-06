import { z } from 'zod';

type Logger = {
	error: (message: string) => void;
	warn: (message: string) => void;
};

type StringOrEnum = z.ZodString | z.ZodEnum<any>;

export class EnvValidator {
	private missingEnvVars: string[] = [];
	private logger: Logger;

	constructor(logger?: Logger) {
		this.logger = logger ?? {
			error: console.error,
			warn: console.warn,
		};
	}

	checkEnvVarExists(varName: string): void {
		if (process.env[varName] !== undefined) return;

		this.logger.error(
			`Missing environment variable: ${varName}. Please define it in your .env file.`
		);
		this.missingEnvVars.push(varName);
	}

	withDefaultString<T extends StringOrEnum>(
		schema: T,
		defaultValue: string | undefined,
		varName: string
	): T {
		this.checkEnvVarExists(varName);

		const newSchema = schema.transform((value: unknown) => {
			if (typeof value !== 'string') {
				this.logger.error(
					`${varName} has an invalid type (${typeof value}). Expected a string. Applying default: "${defaultValue}"`
				);
				return defaultValue!;
			}

			if (value.trim() !== '') return value;

			this.logger.warn(
				`${varName} is empty. Applying default value: "${defaultValue}"`
			);
			return defaultValue!;
		}) as unknown as T;

		if (defaultValue === undefined) return newSchema;

		return newSchema.default(defaultValue) as unknown as T;
	}

  withDefaultNumber(
    schema: z.ZodNumber,
    defaultValue: number,
    varName: string
  ) {
    this.checkEnvVarExists(varName);

    return schema
		.transform((value: unknown) => {
			if (typeof value === 'number' && !Number.isNaN(value)) {
				return value;
			}

			if (value === undefined || value === null) {
				this.logger.warn(
					`${varName} is empty. Applying default value: "${defaultValue}"`
				);
			} else {
				this.logger.error(
					`${varName} has an invalid number value: "${value}". Applying default: "${defaultValue}"`
				);
			}

			return defaultValue;
		})
		.default(defaultValue);
  	}

  	withDefaultBoolean(
		defaultValue: boolean,
		varName: string
	) {
		this.checkEnvVarExists(varName);

		const strictBooleanSchema = z.preprocess((val) => {
			if (typeof val === 'string') {
				const lower = val.trim().toLowerCase();
				
				if (lower === 'false' || lower === '0' || lower === '') return false;
				if (lower === 'true' || lower === '1') return true;

				return false;
			}
			return Boolean(val);
		}, z.boolean());

		return strictBooleanSchema.default(defaultValue);
	}

	getMissingEnvVars(): string[] {
		return [...this.missingEnvVars];
	}
}
