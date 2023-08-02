import { SchemaNodeKind } from '../nodes/types';
import type { SchemaFragment } from '../types';
import { isValidType } from './guards/isValidType';
import { inferType } from './inferType';

export function getTypes(fragment: SchemaFragment): SchemaNodeKind[] | null {
  const types: SchemaNodeKind[] = [];
  let isNullable = false;

  if ('nullable' in fragment) {
    if (fragment.nullable === true) {
      isNullable = true;
    }
  }
  if ('type' in fragment) {
    if (Array.isArray(fragment.type)) {
      types.push(...fragment.type.filter(isValidType));
    } else if (isValidType(fragment.type)) {
      types.push(fragment.type);
    }
    if (isNullable && !types.includes(SchemaNodeKind.Null)) {
      types.push(SchemaNodeKind.Null);
    }
    return types;
  }

  const inferredType = inferType(fragment);
  if (inferredType !== null) {
    types.push(inferredType);
    if (isNullable && !types.includes(SchemaNodeKind.Null)) {
      types.push(SchemaNodeKind.Null);
    }
    return types;
  }

  return null;
}
