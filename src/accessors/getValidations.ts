import type { Dictionary } from '@stoplight/types';

import type { SchemaNodeKind } from '../nodes/types';
import type { SchemaFragment } from '../types';
import { pick } from '../utils/pick';

export const COMMON_VALIDATION_TYPES: string[] = ['readOnly', 'writeOnly', 'style'];

const VALIDATION_TYPES: Partial<Dictionary<(keyof SchemaFragment)[], SchemaNodeKind>> = {
  string: ['minLength', 'maxLength', 'pattern'],
  number: ['multipleOf', 'minimum', 'exclusiveMinimum', 'maximum', 'exclusiveMaximum'],
  get integer() {
    return this.number;
  },
  object: ['additionalProperties', 'minProperties', 'maxProperties'],
  array: ['additionalItems', 'minItems', 'maxItems', 'uniqueItems'],
};

function getTypeValidations(types: SchemaNodeKind[]): (keyof SchemaFragment)[] | null {
  let extraValidations: (keyof SchemaFragment)[] | null = null;

  for (const type of types) {
    const value = VALIDATION_TYPES[type];
    if (value !== void 0) {
      extraValidations ??= [];
      extraValidations.push(...value);
    }
  }

  return extraValidations;
}

export function getValidations(fragment: SchemaFragment, types: SchemaNodeKind[] | null): Dictionary<unknown> {
  const extraValidations = types === null ? null : getTypeValidations(types);

  return {
    ...pick(fragment, COMMON_VALIDATION_TYPES),
    ...(extraValidations !== null ? pick(fragment, extraValidations) : null),
  };
}
