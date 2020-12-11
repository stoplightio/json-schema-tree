import { EventEmitter } from '@stoplight/lifecycle';
import type { Dictionary } from '@stoplight/types';
import createMagicError from 'magic-error';

import { MergingError } from '../errors';
import { isReferenceNode, isRegularNode } from '../guards';
import { mergeAllOf } from '../mergers/mergeAllOf';
import { mergeOneOrAnyOf } from '../mergers/mergeOneOrAnyOf';
import { MirroredReferenceNode, MirroredRegularNode, ReferenceNode, RegularNode } from '../nodes';
import { RootNode } from '../nodes/RootNode';
import { SchemaCombinerName, SchemaNode, SchemaNodeKind } from '../nodes/types';
import type { SchemaFragment } from '../types';
import { isObjectLiteral } from '../utils/guards';
import type { WalkerEmitter, WalkerHookAction, WalkerHookHandler, WalkerSnapshot, WalkingOptions } from './types';

type InternalWalkerState = {
  depth: number;
  pathLength: number;
  schemaNode: RegularNode | RootNode;
};

export class Walker extends EventEmitter<WalkerEmitter> {
  public readonly path: string[];
  public depth: number;

  protected fragment: SchemaFragment;
  protected schemaNode: RegularNode | RootNode;

  private readonly processedFragments: WeakMap<SchemaFragment, SchemaNode>;
  private readonly hooks: Partial<Dictionary<WalkerHookHandler, WalkerHookAction>>;

  constructor(protected readonly root: RootNode, protected readonly walkingOptions: WalkingOptions) {
    super();

    this.path = [];
    this.depth = -1;
    this.fragment = root.fragment;
    this.schemaNode = root;
    this.processedFragments = new WeakMap<SchemaFragment, SchemaNode>();

    this.hooks = {};
  }

  public loadSnapshot(snapshot: WalkerSnapshot) {
    this.path.splice(0, this.path.length, ...snapshot.path);
    this.depth = snapshot.depth;
    this.fragment = snapshot.fragment;
    this.schemaNode = snapshot.schemaNode;
  }

  public saveSnapshot(): WalkerSnapshot {
    return {
      depth: this.depth,
      fragment: this.fragment,
      schemaNode: this.schemaNode,
      path: this.path.slice(),
    };
  }

  public hookInto(action: WalkerHookAction, handler: WalkerHookHandler) {
    this.hooks[action] = handler;
  }

  public restoreWalkerAtNode(node: RegularNode) {
    this.path.splice(0, this.path.length, ...node.path);
    this.depth = node.depth;
    this.fragment = node.fragment;
    this.schemaNode = node;
  }

  public walk(): void {
    const { depth: initialDepth, schemaNode: initialSchemaNode, fragment } = this;

    const state = this.dumpInternalWalkerState();

    super.emit('enterFragment', fragment);

    for (const schemaNode of this.processFragment()) {
      super.emit('enterNode', schemaNode);

      this.processedFragments.set(schemaNode.fragment, schemaNode);

      this.fragment = schemaNode.fragment;
      this.depth = initialDepth + 1;

      const shouldSkipNode = this.hooks.filter?.(schemaNode);

      if (shouldSkipNode === true) {
        super.emit('skipNode', schemaNode);
        continue;
      }

      if (!(schemaNode instanceof RootNode)) {
        schemaNode.parent = initialSchemaNode;
        schemaNode.subpath = this.path.slice(initialSchemaNode.path.length);
      }

      if ('children' in initialSchemaNode && !(schemaNode instanceof RootNode)) {
        if (initialSchemaNode.children === null) {
          (initialSchemaNode as RegularNode).children = [schemaNode];
        } else {
          initialSchemaNode.children.push(schemaNode);
        }
      }

      super.emit('includeNode', schemaNode);

      if (schemaNode instanceof RegularNode) {
        this.schemaNode = schemaNode;

        if (this.hooks.stepIn?.(schemaNode) !== false) {
          super.emit('stepInNode', schemaNode);
          this.walkNodeChildren();
          super.emit('stepOutNode', schemaNode);
        } else {
          super.emit('stepOverNode', schemaNode);
        }
      }

      super.emit('exitNode', schemaNode);
    }

    this.restoreInternalWalkerState(state);
    super.emit('exitFragment', fragment);
  }

  protected dumpInternalWalkerState(): InternalWalkerState {
    return {
      depth: this.depth,
      pathLength: this.path.length,
      schemaNode: this.schemaNode,
    };
  }

  protected restoreInternalWalkerState({ depth, pathLength, schemaNode }: InternalWalkerState) {
    this.depth = depth;
    this.path.length = pathLength;
    this.schemaNode = schemaNode;
  }

  protected walkNodeChildren(): void {
    const { fragment, schemaNode } = this;

    if (!isRegularNode(schemaNode)) return;

    const state = this.dumpInternalWalkerState();

    if (schemaNode.combiners !== null) {
      for (const combiner of schemaNode.combiners) {
        const items = fragment[combiner];
        if (!Array.isArray(items)) continue;

        let i = -1;
        for (const item of items) {
          i++;
          if (!isObjectLiteral(item)) continue;
          this.fragment = item;
          this.restoreInternalWalkerState(state);
          this.path.push(combiner, String(i));
          this.walk();
        }
      }
    }

    switch (schemaNode.primaryType) {
      case SchemaNodeKind.Array:
        if (Array.isArray(fragment.items)) {
          let i = -1;
          for (const item of fragment.items) {
            i++;
            if (!isObjectLiteral(item)) continue;
            this.fragment = item;
            this.restoreInternalWalkerState(state);
            this.path.push('items', String(i));
            this.walk();
          }
        } else if (isObjectLiteral(fragment.items)) {
          this.fragment = fragment.items;
          this.restoreInternalWalkerState(state);
          this.path.push('items');
          this.walk();
        }

        break;
      case SchemaNodeKind.Object:
        if (isObjectLiteral(fragment.properties)) {
          for (const key of Object.keys(fragment.properties)) {
            const value = fragment.properties[key];
            if (!isObjectLiteral(value)) continue;
            this.fragment = value;
            this.restoreInternalWalkerState(state);
            this.path.push('properties', key);
            this.walk();
          }
        }

        if (isObjectLiteral(fragment.patternProperties)) {
          for (const key of Object.keys(fragment.patternProperties)) {
            const value = fragment.patternProperties[key];
            if (!isObjectLiteral(value)) continue;
            this.fragment = value;
            this.restoreInternalWalkerState(state);
            this.path.push('patternProperties', key);
            this.walk();
          }
        }

        break;
    }

    this.schemaNode = schemaNode;
  }

  protected *processFragment(): IterableIterator<SchemaNode> {
    const { walkingOptions, path, processedFragments } = this;
    let { fragment } = this;

    const processedSchemaNode = processedFragments.get(fragment);
    if (processedSchemaNode !== void 0) {
      if (isRegularNode(processedSchemaNode)) {
        return yield new MirroredRegularNode(processedSchemaNode);
      }

      if (isReferenceNode(processedSchemaNode)) {
        return yield new MirroredReferenceNode(processedSchemaNode);
      }

      // whoops, we don't know what to do with it
      throw new TypeError('Cannot mirror the node');
    }

    if ('$ref' in fragment) {
      if (walkingOptions.resolveRef !== null && typeof fragment.$ref === 'string') {
        try {
          fragment = walkingOptions.resolveRef(path, fragment.$ref);
        } catch (ex) {
          super.emit('error', createMagicError(ex));
          return yield new ReferenceNode(fragment, ex?.message ?? 'Unknown resolving error');
        }
      } else {
        return yield new ReferenceNode(fragment, null);
      }
    }

    if (walkingOptions.mergeAllOf && SchemaCombinerName.AllOf in fragment) {
      try {
        fragment = mergeAllOf(fragment, path, walkingOptions);
      } catch (ex) {
        super.emit('error', createMagicError(new MergingError(ex?.message ?? 'Unknown merging error')));
        // no the end of the world - we will render raw unprocessed fragment
      }
    }

    if (SchemaCombinerName.OneOf in fragment || SchemaCombinerName.AnyOf in fragment) {
      try {
        const merged = mergeOneOrAnyOf(fragment, path, walkingOptions);
        if (merged.length === 1) {
          yield new RegularNode(merged[0]);
        } else {
          const combiner = SchemaCombinerName.OneOf in fragment ? SchemaCombinerName.OneOf : SchemaCombinerName.AnyOf;
          yield new RegularNode({
            [combiner]: merged,
          });
        }

        return;
      } catch (ex) {
        super.emit('error', createMagicError(new MergingError(ex?.message ?? 'Unknown merging error')));
        // no the end of the world - we will render raw unprocessed fragment
      }
    }

    yield new RegularNode(fragment);
  }
}
