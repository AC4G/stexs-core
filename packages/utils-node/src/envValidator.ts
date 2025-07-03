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
		if (!(varName in process.env)) {
			this.logger.error(`Missing environment variable: ${varName}. Please define it in your .env file.`);
			this.missingEnvVars.push(varName);
		}
	}

	withDefaultString<T extends StringOrEnum>(
		schema: T,
		defaultValue: string | undefined,
		varName: string
	): T  {
		this.checkEnvVarExists(varName);
	
		const newSchema = schema.transform((value: unknown) => {
			if (typeof value === 'string' && value.trim() === '') {
				this.logger.warn(`${varName} is empty or invalid. Applying default value: "${defaultValue}"`);
				return defaultValue!;
			}
			return value;
		}) as unknown as T;

		if (defaultValue === undefined) return newSchema;

		return newSchema.default(defaultValue) as unknown as T;
	};

	withDefaultNumber(schema: z.ZodNumber, defaultValue: number, varName: string) {
		this.checkEnvVarExists(varName);

		return schema
			.transform((value: number | null | undefined) => {
				if (value === undefined || value === null || value === 0) {
					this.logger.warn(`${varName} is empty or invalid. Applying default value: "${defaultValue}"`);
					return defaultValue;
				}
				return value;
			})
			.default(defaultValue);
	}

	withDefaultBoolean(schema: z.ZodBoolean, defaultValue: boolean, varName: string) {
		this.checkEnvVarExists(varName);

		return schema
			.transform((value: unknown) => {
				if (typeof value === 'string') {
					const lower = value.trim().toLowerCase();
					if (lower === 'true' || lower === '1') return true;
					if (lower === 'false' || lower === '0') return false;

					this.logger.error(`${varName} has an invalid boolean value: "${value}". Applying default: "${defaultValue}"`);
					return defaultValue;
				}
				if (typeof value === 'boolean') return value;

				this.logger.error(`${varName} has an unexpected type (${typeof value}). Applying default: "${defaultValue}"`);
				return defaultValue;
			})
			.default(defaultValue);
	}

	getMissingEnvVars(): string[] {
		return [...this.missingEnvVars];
	}
}
