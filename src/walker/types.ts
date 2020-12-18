import type { RegularNode, SchemaNode } from '../nodes';
import type { RootNode } from '../nodes/RootNode';
import type { SchemaFragment } from '../types';

export type WalkerRefResolver = (path: string[] | null, $ref: string) => SchemaFragment;

export type WalkingOptions = {
  mergeAllOf: boolean;
  resolveRef: WalkerRefResolver | null;
};

export type WalkerSnapshot = {
  readonly fragment: SchemaFragment;
  readonly depth: number;
  readonly schemaNode: RegularNode | RootNode;
  readonly path: string[];
};

export type WalkerHookAction = 'filter' | 'stepIn';
export type WalkerHookHandler = (node: SchemaNode) => boolean;

export type WalkerNodeEventHandler = (node: SchemaNode) => void;
export type WalkerFragmentEventHandler = (node: SchemaFragment) => void;
export type WalkerErrorEventHandler = (ex: Error) => void;

export type WalkerEmitter = {
  enterNode: WalkerNodeEventHandler;
  exitNode: WalkerNodeEventHandler;

  includeNode: WalkerNodeEventHandler;
  skipNode: WalkerNodeEventHandler;

  stepInNode: WalkerNodeEventHandler;
  stepOverNode: WalkerNodeEventHandler;
  stepOutNode: WalkerNodeEventHandler;

  enterFragment: WalkerFragmentEventHandler;
  exitFragment: WalkerFragmentEventHandler;

  error: WalkerErrorEventHandler;
};
