import { pathToPointer, stringify } from '@stoplight/json';

import { ResolvingError } from '../errors';
import type { SchemaFragment } from '../types';
import type { WalkerRefResolver, WalkingOptions } from '../walker/types';

const resolveAllOf = require('@stoplight/json-schema-merge-allof');

const store = new WeakMap<WalkerRefResolver, WeakMap<SchemaFragment, string[]>>();

function _mergeAllOf(fragment: SchemaFragment, path: string[], resolveRef: WalkerRefResolver | null): SchemaFragment {
  return resolveAllOf(fragment, {
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
              const safelyResolved = JSON.parse(stringify(resolveRef(null, $ref)));
              return 'allOf' in safelyResolved ? _mergeAllOf(safelyResolved, path, resolveRef) : safelyResolved;
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
}

export function mergeAllOf(fragment: SchemaFragment, path: string[], walkingOptions: WalkingOptions) {
  if (walkingOptions.resolveRef !== null && !store.has(walkingOptions.resolveRef)) {
    store.set(walkingOptions.resolveRef, new WeakMap());
  }

  let merged = _mergeAllOf(fragment, path, walkingOptions.resolveRef);
  while ('allOf' in merged) {
    merged = _mergeAllOf(merged, path, walkingOptions.resolveRef);
  }

  return merged;
}
