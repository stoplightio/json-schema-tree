import type { Dictionary } from '@stoplight/types';

export function pick(target: object, keys: (string | number)[]) {
  const source: Dictionary<unknown, string | number> = {};

  for (const key of keys) {
    if (key in target) {
      source[key] = target[key];
    }
  }

  return source;
}
