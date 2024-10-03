// renders a json object in an human readable format
type Value =
	| string
	| number
	| boolean
	| null
	| Value[]
	| { [key: string]: Value };

export default function format(
	obj: { [key: string]: Value },
	indent = 0,
): string {
	return Object.entries(obj)
		.map(([key, value]: [string, Value]) => {
			const indentation = '  '.repeat(indent);

			if (Array.isArray(value)) {
				return `${indentation}${key}:\n${value
					.map((item) => `${indentation}  • ${item}`)
					.join('\n')}`;
			} else if (typeof value === 'object' && value !== null) {
				return `${indentation}${key}:\n${format(value, indent + 1)}`;
			} else {
				return `${indentation}${key}: ${value}`;
			}
		})
		.join('\n');
}
