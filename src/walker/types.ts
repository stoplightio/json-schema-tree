import type { SchemaFragment } from '../types';

export type WalkerRefResolver = (path: string[] | null, $ref: string) => SchemaFragment;

export type WalkingOptions = {
  mergeAllOf: boolean;
  resolveRef: WalkerRefResolver | null;
};
