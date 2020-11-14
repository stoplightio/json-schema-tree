import { SchemaCombinerName } from '../nodes/types';
import type { SchemaFragment } from '../types';
import type { WalkingOptions } from '../walker/types';
import { mergeAllOf } from './mergeAllOf';

export function mergeOneOrAnyOf(
  fragment: SchemaFragment,
  path: string[],
  walkingOptions: WalkingOptions,
): SchemaFragment[] {
  const combiner = SchemaCombinerName.OneOf in fragment ? SchemaCombinerName.OneOf : SchemaCombinerName.AnyOf;
  const items = fragment[combiner];

  if (!Array.isArray(items)) return []; // just in case

  const merged: SchemaFragment[] = [];

  if (Array.isArray(fragment.allOf) && Array.isArray(items)) {
    for (const item of items) {
      merged.push({
        allOf: [...fragment.allOf, item],
      });
    }

    return merged;
  } else {
    for (const item of items) {
      const prunedSchema = { ...fragment };
      delete prunedSchema[combiner];

      const resolvedItem =
        typeof item.$ref === 'string' && walkingOptions.resolveRef !== null
          ? walkingOptions.resolveRef(null, item.$ref)
          : item;

      if (Object.keys(prunedSchema).length === 0) {
        merged.push(resolvedItem);
      } else {
        const mergedSchema = {
          allOf: [prunedSchema, resolvedItem],
        };

        try {
          merged.push(mergeAllOf(mergedSchema, path, walkingOptions));
        } catch {
          merged.push(mergedSchema);
        }
      }
    }
  }

  return merged;
}
