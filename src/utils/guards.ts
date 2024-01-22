import type { Dictionary } from '@stoplight/types';

import type { SchemaFragment } from '../types';

export function isStringOrNumber(value: unknown): value is number | string {
  return typeof value === 'string' || typeof value === 'number';
}

export function isObject(maybeObj: unknown): maybeObj is object {
  return maybeObj !== void 0 && maybeObj !== null && typeof maybeObj === 'object';
}

export function isPrimitive(
  maybePrimitive: unknown,
): maybePrimitive is string | number | boolean | undefined | null | symbol | bigint {
  return typeof maybePrimitive !== 'function' && !isObject(maybePrimitive);
}

export function isObjectLiteral(maybeObj: unknown): maybeObj is Dictionary<unknown> {
  if (isPrimitive(maybeObj) === true) return false;
  const proto = Object.getPrototypeOf(maybeObj);
  return proto === null || proto === Object.prototype;
}

export function isNonNullable<T = unknown>(maybeNullable: T): maybeNullable is NonNullable<T> {
  return maybeNullable !== void 0 && maybeNullable !== null;
}

export function isValidSchemaFragment(maybeSchemaFragment: unknown): maybeSchemaFragment is SchemaFragment {
  return typeof maybeSchemaFragment === 'boolean' || isObjectLiteral(maybeSchemaFragment);
}
