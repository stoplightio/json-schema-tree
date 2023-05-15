import { SchemaCombinerName } from '../nodes/types';
import type { SchemaFragment } from '../types';
import type { WalkingOptions } from '../walker/types';
import { mergeAllOf } from './mergeAllOf';

export function mergeOneOrAnyOf(
  fragment: SchemaFragment,
  path: string[],
  walkingOptions: WalkingOptions,
  mergedAllOfs: WeakMap<SchemaFragment, SchemaFragment>,
): SchemaFragment[] {
  const combiner = SchemaCombinerName.OneOf in fragment ? SchemaCombinerName.OneOf : SchemaCombinerName.AnyOf;
  const items = fragment[combiner];

  if (!Array.isArray(items)) return []; // just in case

  const merged: SchemaFragment[] = [];

  if (Array.isArray(fragment.allOf)) {
    for (const item of items) {
      merged.push({
        allOf: [...fragment.allOf, item],
      });
    }

    return merged;
  } else {
    const prunedSchema = { ...fragment };
    delete prunedSchema[combiner];

    for (const item of items) {
      if (Object.keys(prunedSchema).length === 0) {
        merged.push(item);
      } else {
        merged.push(
          mergeAllOf(
            {
              allOf: [prunedSchema, item],
            },
            path,
            walkingOptions,
            mergedAllOfs,
          ),
        );
      }
    }
  }

  return merged;
}
