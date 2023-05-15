import { pathToPointer } from '@stoplight/json';

import { ResolvingError } from '../errors';
import type { SchemaFragment } from '../types';
import type { WalkerRefResolver, WalkingOptions } from '../walker/types';

const resolveAllOf = require('@stoplight/json-schema-merge-allof');

const store = new WeakMap<WalkerRefResolver, WeakMap<SchemaFragment, string[]>>();

function _mergeAllOf(
  fragment: SchemaFragment,
  path: string[],
  resolveRef: WalkerRefResolver | null,
  seen: WeakMap<SchemaFragment, SchemaFragment>,
): SchemaFragment {
  const cached = seen.get(fragment);
  if (cached !== void 0) {
    return cached;
  }

  const merged = resolveAllOf(fragment, {
    deep: false,
    resolvers: resolveAllOf.stoplightResolvers,
    ...(resolveRef !== null
      ? {
          $refResolver($ref: unknown) {
            if (typeof $ref !== 'string') {
              return {};
            }

            if (pathToPointer(path).startsWith($ref)) {
              throw new ResolvingError('Circular reference detected');
            }

            const allRefs = store.get(resolveRef)!;
            let schemaRefs = allRefs.get(fragment);

            if (schemaRefs === void 0) {
              schemaRefs = [$ref];
              allRefs.set(fragment, schemaRefs);
            } else if (schemaRefs.includes($ref)) {
              const resolved = resolveRef(null, $ref);
              return 'allOf' in resolved ? _mergeAllOf(resolved, path, resolveRef, seen) : resolved;
            } else {
              schemaRefs.push($ref);
            }

            const resolved = resolveRef(null, $ref);

            if (Array.isArray(resolved.allOf)) {
              for (const member of resolved.allOf) {
                const index = schemaRefs.indexOf(member.$ref);
                if (typeof member.$ref === 'string' && index !== -1 && index !== schemaRefs.lastIndexOf(member.$ref)) {
                  throw new ResolvingError('Circular reference detected');
                }
              }
            }

            return resolved;
          },
        }
      : null),
  });

  seen.set(fragment, merged);
  return merged;
}

export function mergeAllOf(
  fragment: SchemaFragment,
  path: string[],
  walkingOptions: WalkingOptions,
  seen: WeakMap<SchemaFragment, SchemaFragment>,
) {
  if (walkingOptions.resolveRef !== null && !store.has(walkingOptions.resolveRef)) {
    store.set(walkingOptions.resolveRef, new WeakMap());
  }

  let merged = fragment;
  do {
    merged = _mergeAllOf(merged, path, walkingOptions.resolveRef, seen);
  } while ('allOf' in merged);

  return merged;
}
