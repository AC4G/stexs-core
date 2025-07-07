import { GrantTypes, possibleGrantTypes } from "../types/auth";

export function isGrantType(value: unknown): value is GrantTypes {
	return possibleGrantTypes.includes(value as GrantTypes);
}
