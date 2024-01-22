import { EventEmitter } from '@stoplight/lifecycle';
import type { Dictionary } from '@stoplight/types';
import createMagicError from 'magic-error';

import { MergingError } from '../errors';
import { isMirroredNode, isReferenceNode, isRegularNode, isRootNode } from '../guards';
import { mergeAllOf } from '../mergers/mergeAllOf';
import { mergeOneOrAnyOf } from '../mergers/mergeOneOrAnyOf';
import { MirroredReferenceNode, MirroredRegularNode, MirroredSchemaNode, ReferenceNode, RegularNode } from '../nodes';
import { BooleanishNode } from '../nodes/BooleanishNode';
import type { RootNode } from '../nodes/RootNode';
import { SchemaCombinerName, SchemaNode, SchemaNodeKind } from '../nodes/types';
import type { SchemaFragment } from '../types';
import { isNonNullable, isObjectLiteral, isValidSchemaFragment } from '../utils/guards';
import type { WalkerEmitter, WalkerHookAction, WalkerHookHandler, WalkerSnapshot, WalkingOptions } from './types';

type InternalWalkerState = {
  depth: number;
  pathLength: number;
  schemaNode: RegularNode | RootNode;
};

type ProcessedFragment = SchemaFragment | SchemaFragment[];

export class Walker extends EventEmitter<WalkerEmitter> {
  public readonly path: string[];
  public depth: number;

  protected fragment: SchemaFragment | boolean;
  protected schemaNode: RegularNode | RootNode;

  private mergedAllOfs: WeakMap<SchemaFragment, SchemaFragment>;
  private processedFragments: WeakMap<ProcessedFragment, SchemaNode>;

  private readonly hooks: Partial<Dictionary<WalkerHookHandler, WalkerHookAction>>;

  constructor(protected readonly root: RootNode, protected readonly walkingOptions: WalkingOptions) {
    super();

    let maxRefDepth = walkingOptions.maxRefDepth ?? null;
    if (typeof maxRefDepth === 'number') {
      if (maxRefDepth < 1) {
        maxRefDepth = null;
      } else if (maxRefDepth > 1000) {
        // experimented with 1500 and the recursion limit is still lower than that
        maxRefDepth = 1000;
      }
    }
    walkingOptions.maxRefDepth = maxRefDepth;

    this.path = [];
    this.depth = -1;
    this.fragment = root.fragment;
    this.schemaNode = root;
    this.processedFragments = new WeakMap();
    this.mergedAllOfs = new WeakMap();

    this.hooks = {};
  }

  public destroy() {
    this.path.length = 0;
    this.depth = -1;
    this.fragment = this.root.fragment;
    this.schemaNode = this.root;
    this.processedFragments = new WeakMap();
    this.mergedAllOfs = new WeakMap();
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
    this.processedFragments.delete(node.fragment);
    this.path.splice(0, this.path.length, ...node.path);
    this.depth = node.depth;
    this.fragment = node.fragment;
    this.schemaNode = node;
  }

  public walk(): void {
    const { depth: initialDepth, fragment } = this;
    let { schemaNode: initialSchemaNode } = this;

    if (initialDepth === -1 && Object.keys(fragment).length === 0) {
      // empty schema, nothing to do
      return;
    }

    while (isMirroredNode(initialSchemaNode)) {
      if (!isRegularNode(initialSchemaNode.mirroredNode)) {
        return;
      }

      if (initialSchemaNode.mirroredNode.children === void 0) {
        this.restoreWalkerAtNode(initialSchemaNode.mirroredNode);
        initialSchemaNode = this.schemaNode;
        this.depth = initialDepth;
      } else {
        return;
      }
    }

    const state = this.dumpInternalWalkerState();

    super.emit('enterFragment', fragment);
    const [schemaNode, initialFragment] = this.processFragment();
    super.emit('enterNode', schemaNode);

    const actualNode = isMirroredNode(schemaNode) ? schemaNode.mirroredNode : schemaNode;
    if (typeof schemaNode.fragment !== 'boolean' && initialFragment !== null) {
      this.processedFragments.set(schemaNode.fragment, actualNode);
      this.processedFragments.set(initialFragment, actualNode);
    }

    this.fragment = schemaNode.fragment;
    this.depth = initialDepth + 1;

    const isIncluded = this.hooks.filter?.(schemaNode);

    if (isIncluded === false) {
      super.emit('skipNode', schemaNode);
      return;
    }

    if (!isRootNode(schemaNode)) {
      schemaNode.parent = initialSchemaNode;
      schemaNode.subpath = this.path.slice(initialSchemaNode.path.length);
    }

    if ('children' in initialSchemaNode && !isRootNode(schemaNode)) {
      if (initialSchemaNode.children === void 0) {
        (initialSchemaNode as RegularNode).children = [schemaNode];
      } else {
        initialSchemaNode.children!.push(schemaNode);
      }
    }

    super.emit('includeNode', schemaNode);

    if (isRegularNode(schemaNode)) {
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

    if (!isRegularNode(schemaNode) || typeof fragment === 'boolean') return;

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
            if (!isValidSchemaFragment(item)) continue;
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
            if (!isValidSchemaFragment(value)) continue;
            this.fragment = value;
            this.restoreInternalWalkerState(state);
            this.path.push('properties', key);
            this.walk();
          }
        }

        if (isObjectLiteral(fragment.patternProperties)) {
          for (const key of Object.keys(fragment.patternProperties)) {
            const value = fragment.patternProperties[key];
            if (!isValidSchemaFragment(value)) continue;
            this.fragment = value;
            this.restoreInternalWalkerState(state);
            this.path.push('patternProperties', key);
            this.walk();
          }
        }

        if (isValidSchemaFragment(fragment.additionalProperties)) {
          this.fragment = fragment.additionalProperties;
          this.restoreInternalWalkerState(state);
          this.path.push('additionalProperties');
          this.walk();
        }

        break;
    }

    this.schemaNode = schemaNode;
  }

  protected retrieveFromFragment(
    fragment: ProcessedFragment,
    originalFragment: SchemaFragment,
  ): [MirroredSchemaNode, ProcessedFragment] | void {
    const processedSchemaNode = this.processedFragments.get(fragment);
    if (processedSchemaNode !== void 0) {
      if (isRegularNode(processedSchemaNode)) {
        return [new MirroredRegularNode(processedSchemaNode, { originalFragment }), fragment];
      }

      if (isReferenceNode(processedSchemaNode)) {
        return [new MirroredReferenceNode(processedSchemaNode), fragment];
      }

      // whoops, we don't know what to do with it
      throw new TypeError('Cannot mirror the node');
    }
  }

  protected processFragment(): [SchemaNode, ProcessedFragment | null] {
    const { walkingOptions, path, fragment: originalFragment, depth } = this;
    let { fragment } = this;

    if (typeof fragment === 'boolean') {
      return [new BooleanishNode(fragment), null];
    }

    if (typeof originalFragment === 'boolean') {
      throw new TypeError('Original fragment cannot be a boolean');
    }

    let retrieved = isNonNullable(fragment) ? this.retrieveFromFragment(fragment, fragment) : null;

    if (retrieved) {
      return retrieved;
    }

    let initialFragment: ProcessedFragment = fragment;

    if ('$ref' in fragment) {
      if (typeof walkingOptions.maxRefDepth === 'number' && walkingOptions.maxRefDepth < depth) {
        return [new ReferenceNode(fragment, `max $ref depth limit reached`), fragment];
      } else if (typeof fragment.$ref !== 'string') {
        return [new ReferenceNode(fragment, '$ref is not a string'), fragment];
      } else if (walkingOptions.resolveRef !== null) {
        try {
          let newFragment = walkingOptions.resolveRef(path, fragment.$ref);

          if (typeof fragment.description === 'string') {
            newFragment = { ...newFragment };
            Object.assign(newFragment, { description: fragment.description });
          } else {
            retrieved = this.retrieveFromFragment(newFragment, originalFragment);
            if (retrieved) {
              return retrieved;
            }
          }

          fragment = newFragment;
        } catch (ex) {
          super.emit('error', createMagicError(ex));
          return [new ReferenceNode(fragment, ex?.message ?? 'Unknown resolving error'), fragment];
        }
      } else {
        return [new ReferenceNode(fragment, null), fragment];
      }
    }
    //fragment with type 'array' and no description should adopt description of $ref if it exists.
    if (fragment.type === 'array' && fragment.description === void 0) {
      if (fragment.items !== void 0 && isObjectLiteral(fragment.items)) {
        for (const key of Object.keys(fragment.items)) {
          if (key === '$ref') {
            const refToResolve = fragment.items[key];
            if (typeof refToResolve !== 'string') {
              return [new ReferenceNode(fragment, '$ref is not a string'), fragment];
            } else if (walkingOptions.resolveRef !== null) {
              try {
                let newFragment = walkingOptions.resolveRef(path, refToResolve);
                if (newFragment.description !== void 0) {
                  newFragment = { ...newFragment };
                  Object.assign(fragment, { description: newFragment.description });
                }
              } catch (ex) {
                super.emit('error', createMagicError(ex));
              }
            }
          }
        }
      }
    }
    if (walkingOptions.mergeAllOf && SchemaCombinerName.AllOf in fragment) {
      try {
        if (Array.isArray(fragment.allOf)) {
          initialFragment = fragment.allOf;
        }

        fragment = mergeAllOf(fragment, path, walkingOptions, this.mergedAllOfs);
      } catch (ex) {
        initialFragment = fragment;
        super.emit('error', createMagicError(new MergingError(ex?.message ?? 'Unknown merging error')));
        // no the end of the world - we will render raw unprocessed fragment
      }
    }

    if (SchemaCombinerName.OneOf in fragment || SchemaCombinerName.AnyOf in fragment) {
      try {
        const merged = mergeOneOrAnyOf(fragment, path, walkingOptions, this.mergedAllOfs);
        if (merged.length === 1) {
          return [new RegularNode(merged[0], { originalFragment }), initialFragment];
        } else {
          const combiner = SchemaCombinerName.OneOf in fragment ? SchemaCombinerName.OneOf : SchemaCombinerName.AnyOf;
          return [new RegularNode({ [combiner]: merged }, { originalFragment }), initialFragment];
        }
      } catch (ex) {
        super.emit('error', createMagicError(new MergingError(ex?.message ?? 'Unknown merging error')));
        // no the end of the world - we will render raw unprocessed fragment
      }
    }

    retrieved = isNonNullable(fragment) ? this.retrieveFromFragment(initialFragment, originalFragment) : null;

    if (retrieved) {
      return retrieved;
    }

    return [new RegularNode(fragment, { originalFragment }), initialFragment];
  }
}
