import { SchemaNodeKind } from '../nodes/types';
import type { SchemaFragment } from '../types';

export function getPrimaryType(fragment: SchemaFragment, types: SchemaNodeKind[] | null) {
  if (types !== null) {
    if (types.includes(SchemaNodeKind.Object)) {
      return SchemaNodeKind.Object;
    }

    if (types.includes(SchemaNodeKind.Array)) {
      return SchemaNodeKind.Array;
    }

    if (types.length > 0) {
      return types[0];
    }

    return null;
  }

  return null;
}
