import type { Dictionary } from '@stoplight/types';

import { isObject } from './guards';

export function get(obj: Dictionary<unknown>, path: (string | number)[]): unknown {
  if (path.length === 0) {
    return obj;
  }

  let curObj: object = obj;

  for (let i = 0; i < path.length - 1; i++) {
    let segment = path[i];

    curObj = curObj[segment];

    if (!isObject(curObj)) {
      return;
    }
  }

  return curObj[path[path.length - 1]];
}
