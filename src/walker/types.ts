import type { SchemaNode } from '../nodes';
import type { SchemaFragment } from '../types';

export type WalkerRefResolver = (path: string[] | null, $ref: string) => SchemaFragment;

export type WalkingOptions = {
  mergeAllOf: boolean;
  resolveRef: WalkerRefResolver | null;
};

export type WalkerItem = {
  node: SchemaNode;
  parentNode: SchemaNode | null;
};

export type WalkerSnapshot = {
  readonly fragment: SchemaFragment;
  readonly depth: number;
  readonly path: string[];
};

export type WalkerHookAction = 'filter' | 'stepIn';
export type WalkerHookHandler = (node: SchemaNode) => boolean;

export type WalkerEvent = 'newNode' | 'enterNode' | 'exitNode';
export type WalkerEventHandler = (node: SchemaNode) => void;
