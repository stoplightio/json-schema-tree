import { EventEmitter } from '@stoplight/lifecycle';
import type { Dictionary } from '@stoplight/types';

import { isRegularNode } from '../guards';
import { mergeAllOf } from '../mergers/mergeAllOf';
import { mergeOneOrAnyOf } from '../mergers/mergeOneOrAnyOf';
import { ReferenceNode, RegularNode } from '../nodes';
import { MirrorNode } from '../nodes/MirrorNode';
import { RootNode } from '../nodes/RootNode';
import { SchemaCombinerName, SchemaNode, SchemaNodeKind } from '../nodes/types';
import type { SchemaFragment } from '../types';
import { isObjectLiteral } from '../utils/guards';
import type {
  WalkerEvent,
  WalkerEventHandler,
  WalkerHookAction,
  WalkerHookHandler,
  WalkerItem,
  WalkerSnapshot,
  WalkingOptions,
} from './types';

export class Walker extends EventEmitter<Dictionary<WalkerEventHandler, WalkerEvent>> {
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

  public loadState(snapshot: WalkerSnapshot) {
    this.path.splice(0, this.path.length, ...snapshot.path);
    this.depth = snapshot.depth;
    this.fragment = snapshot.fragment;
    this.schemaNode = snapshot.schemaNode;
  }

  public saveState(): WalkerSnapshot {
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

  public *walk(): IterableIterator<WalkerItem> {
    const {
      depth: initialDepth,
      schemaNode: initialSchemaNode,
      path: { length },
    } = this;

    for (const schemaNode of this.processFragment()) {
      super.emit('newNode', schemaNode);

      this.processedFragments.set(schemaNode.fragment, schemaNode);

      this.fragment = schemaNode.fragment;
      this.depth = initialDepth + 1;

      const shouldSkipNode = this.hooks.filter?.(schemaNode);

      if (shouldSkipNode === true) {
        continue;
      }

      if (!(schemaNode instanceof RootNode)) {
        schemaNode.parent = initialSchemaNode;
        schemaNode.subpath = this.path.slice(initialSchemaNode.path.length);
      }

      if ('children' in initialSchemaNode) {
        if (initialSchemaNode.children === null) {
          (initialSchemaNode as RegularNode).children = [schemaNode];
        } else {
          initialSchemaNode.children.push(schemaNode);
        }
      }

      super.emit('acceptNode', schemaNode);

      if (schemaNode instanceof RegularNode) {
        this.schemaNode = schemaNode;

        if (this.hooks.stepIn?.(schemaNode) !== false) {
          super.emit('enterNode', schemaNode);
          yield* this.walkNodeChildren();
        }
      }

      super.emit('exitNode', schemaNode);
    }

    this.path.length = length;
    this.depth = initialDepth;
    this.schemaNode = initialSchemaNode;
  }

  protected *walkNodeChildren() {
    const { fragment, schemaNode } = this;

    if (!isRegularNode(schemaNode)) return;

    const {
      depth: initialDepth,
      schemaNode: initialSchemaNode,
      path: { length },
    } = this;

    if (schemaNode.combiners !== null) {
      for (const combiner of schemaNode.combiners) {
        const items = fragment[combiner];
        if (!Array.isArray(items)) continue;

        let i = -1;
        for (const item of items) {
          i++;
          if (!isObjectLiteral(item)) continue;
          this.fragment = item;
          // todo: spaghetti
          this.schemaNode = initialSchemaNode;
          this.depth = initialDepth;
          this.path.length = length;
          this.path.push(combiner, String(i));
          yield* this.walk();
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
            this.schemaNode = initialSchemaNode;
            this.depth = initialDepth;
            this.path.length = length;
            this.path.push('items', String(i));
            yield* this.walk();
          }
        } else if (isObjectLiteral(fragment.items)) {
          this.schemaNode = initialSchemaNode;
          this.depth = initialDepth;
          this.path.length = length;
          this.fragment = fragment.items;
          this.path.push('items');
          yield* this.walk();
        }

        break;
      case SchemaNodeKind.Object:
        if (isObjectLiteral(fragment.properties)) {
          for (const key of Object.keys(fragment.properties)) {
            const value = fragment.properties[key];
            if (!isObjectLiteral(value)) continue;
            this.fragment = value;
            this.schemaNode = initialSchemaNode;
            this.depth = initialDepth;
            this.path.length = length;
            this.path.push('properties', key);
            yield* this.walk();
          }
        }

        if (isObjectLiteral(fragment.patternProperties)) {
          for (const key of Object.keys(fragment.patternProperties)) {
            const value = fragment.patternProperties[key];
            if (!isObjectLiteral(value)) continue;
            this.schemaNode = initialSchemaNode;
            this.depth = initialDepth;
            this.path.length = length;
            this.fragment = value;
            this.path.push('patternProperties', key);
            yield* this.walk();
          }
        }

        break;
    }

    this.schemaNode = schemaNode;
  }

  protected *processFragment(): IterableIterator<SchemaNode> {
    const { walkingOptions, path, processedFragments } = this;
    let { fragment } = this;

    const processedFragment = processedFragments.get(fragment);
    if (processedFragment !== void 0) {
      return yield new MirrorNode(processedFragment);
    }

    if ('$ref' in fragment) {
      if (walkingOptions.resolveRef !== null && typeof fragment.$ref === 'string') {
        try {
          fragment = walkingOptions.resolveRef(path, fragment.$ref);
        } catch (ex) {
          return yield new ReferenceNode(fragment, ex?.message ?? 'Unknown resolving error');
        }
      } else {
        return yield new ReferenceNode(fragment, null);
      }
    }

    if (walkingOptions.mergeAllOf && SchemaCombinerName.AllOf in fragment) {
      try {
        fragment = mergeAllOf(fragment, path, walkingOptions);
      } catch {
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
      } catch {
        // no the end of the world - we will render raw unprocessed fragment
      }
    }

    yield new RegularNode(fragment);
  }
}
