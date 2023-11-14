import type { SchemaFragment } from '../types';

export type SchemaTreeOptions = {
  mergeAllOf: boolean;
  /** Resolves references to the schemas. If providing a custom implementation, it must return the same object reference for the same reference string. */
  refResolver: SchemaTreeRefDereferenceFn | null;
  /** Controls the level of recursion of refs. Prevents overly complex trees and running out of stack depth. */
  maxRefDepth?: number | null;
};

export type SchemaTreeRefInfo = {
  source: string | null;
  pointer: string | null;
};

export type SchemaTreeRefDereferenceFn = (
  ref: SchemaTreeRefInfo,
  propertyPath: string[] | null,
  schema: SchemaFragment,
) => SchemaFragment;
