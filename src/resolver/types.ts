import type { SchemaFragment } from '../types';

export type SchemaTreeRefInfo = {
  source: string | null;
  pointer: string | null;
};

export type SchemaTreeRefDereferenceFn = (
  ref: SchemaTreeRefInfo,
  propertyPath: string[] | null,
  schema: SchemaFragment,
) => SchemaFragment;
