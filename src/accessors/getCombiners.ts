import { SchemaCombinerName } from '../nodes/types';
import type { SchemaFragment } from '../types';

export function getCombiners(fragment: SchemaFragment): SchemaCombinerName[] | null {
  let combiners: SchemaCombinerName[] | null = null;

  if (SchemaCombinerName.AnyOf in fragment) {
    combiners ??= [];
    combiners.push(SchemaCombinerName.AnyOf);
  }

  if (SchemaCombinerName.OneOf in fragment) {
    combiners ??= [];
    combiners.push(SchemaCombinerName.OneOf);
  }

  if (SchemaCombinerName.AllOf in fragment) {
    combiners ??= [];
    combiners.push(SchemaCombinerName.AllOf);
  }

  return combiners;
}
