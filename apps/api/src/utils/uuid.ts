import { version as uuidVersion, validate as validateUUID } from 'uuid';

export function validateUUIDV4(uuid: string): boolean {
  return validateUUID(uuid) && uuidVersion(uuid) === 4;
}
