import { SchemaNodeKind } from '../nodes/types';
import type { SchemaFragment } from '../types';

export function inferType(fragment: SchemaFragment): SchemaNodeKind | null {
  if ('properties' in fragment || 'additionalProperties' in fragment || 'patternProperties' in fragment) {
    return SchemaNodeKind.Object;
  }

  if ('items' in fragment || 'additionalItems' in fragment) {
    return SchemaNodeKind.Array;
  }

  return null;
}
