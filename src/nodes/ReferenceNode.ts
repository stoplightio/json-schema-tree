import { isLocalRef } from '@stoplight/json';

import { unwrapStringOrNull } from '../accessors/unwrap';
import { isReferenceNode, isSchemaNode } from '../guards';
import type { SchemaFragment } from '../types';
import { BaseNode } from './BaseNode';

export class ReferenceNode extends BaseNode {
  public readonly value: string | null;

  constructor(fragment: SchemaFragment, public readonly error: string | null) {
    super(fragment);

    this.value = unwrapStringOrNull(fragment.$ref);
  }

  public get external() {
    return this.value !== null && !isLocalRef(this.value);
  }

  static [Symbol.hasInstance](instance: unknown) {
    return isSchemaNode(instance) && isReferenceNode(instance);
  }
}
