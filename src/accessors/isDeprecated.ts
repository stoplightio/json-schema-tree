import type { SchemaFragment } from '../types';

export function isDeprecated(fragment: SchemaFragment): boolean {
  if ('x-deprecated' in fragment) {
    return fragment['x-deprecated'] === true;
  }

  if ('deprecated' in fragment) {
    return fragment.deprecated === true;
  }

  return false;
}
