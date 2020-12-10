import type { RegularNode, SchemaNode } from '../nodes';
import type { RootNode } from '../nodes/RootNode';
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
  readonly schemaNode: RegularNode | RootNode;
  readonly path: string[];
};

export type WalkerHookAction = 'filter' | 'stepIn';
export type WalkerHookHandler = (node: SchemaNode) => boolean;

export type WalkerEvent = 'newNode' | 'acceptNode' | 'enterNode' | 'exitNode' | 'error';
export type WalkerNodeEventHandler = (node: SchemaNode) => void;
export type WalkerErrorEventHandler = (ex: Error) => void;

export type WalkerEmitter = {
  newNode: WalkerNodeEventHandler;
  acceptNode: WalkerNodeEventHandler;
  enterNode: WalkerNodeEventHandler;
  exitNode: WalkerNodeEventHandler;
  error: WalkerErrorEventHandler;
};
