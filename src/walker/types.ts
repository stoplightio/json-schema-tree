import type { RegularNode, SchemaNode } from '../nodes';
import type { RootNode } from '../nodes/RootNode';
import type { SchemaFragment } from '../types';

export type WalkerRefResolver = (path: string[] | null, $ref: string) => SchemaFragment;

export type WalkingOptions = {
  mergeAllOf: boolean;
  /** Resolves references to the schemas. If providing a custom implementation, it must return the same object reference for the same reference string. */
  resolveRef: WalkerRefResolver | null;
  /** Controls the level of recursion of refs. Prevents overly complex trees and running out of stack depth. */
  maxRefDepth?: number | null;
};

export type WalkerSnapshot = {
  readonly fragment: SchemaFragment | boolean;
  readonly depth: number;
  readonly schemaNode: RegularNode | RootNode;
  readonly path: string[];
};

export type WalkerHookAction = 'filter' | 'stepIn';
export type WalkerHookHandler = (node: SchemaNode) => boolean;

export type WalkerNodeEventHandler = (node: SchemaNode) => void;
export type WalkerFragmentEventHandler = (node: SchemaFragment | boolean) => void;
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
