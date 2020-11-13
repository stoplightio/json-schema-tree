import { isStringOrNumber } from '../utils/guards';

export function getRequired(required: unknown): string[] | null {
  if (!Array.isArray(required)) return null;
  return required.filter(isStringOrNumber).map(String);
}
