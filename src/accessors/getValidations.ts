import type { Dictionary } from '@stoplight/types';
import type { JSONSchema4 } from 'json-schema';

import type { SchemaNodeKind } from '../nodes/types';
import type { SchemaFragment } from '../types';
import { pick } from '../utils/pick';

export const COMMON_VALIDATION_TYPES: (keyof JSONSchema4)[] = [
  'default',
  'example',
  'nullable',
  'discriminator',
  'readOnly',
  'writeOnly',
  'xml',
  'externalDocs',
];

const VALIDATION_TYPES: Partial<Dictionary<(keyof JSONSchema4)[], SchemaNodeKind>> = {
  string: ['minLength', 'maxLength', 'pattern'],
  number: ['multipleOf', 'minimum', 'exclusiveMinimum', 'maximum', 'exclusiveMaximum'],
  get integer() {
    return this.number;
  },
  object: ['additionalProperties', 'minProperties', 'maxProperties'],
  array: ['additionalItems', 'minItems', 'maxItems', 'uniqueItems'],
};

function getTypeValidations(types: SchemaNodeKind[]): (keyof JSONSchema4)[] | null {
  let extraValidations: (keyof JSONSchema4)[] | null = null;

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
