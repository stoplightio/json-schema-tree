import { EventEmitter } from '@stoplight/lifecycle';

import { mergeAllOf } from '../mergers/mergeAllOf';
import { mergeOneOrAnyOf } from '../mergers/mergeOneOrAnyOf';
import { ReferenceNode, RegularNode } from '../nodes';
import { MirrorNode } from '../nodes/MirrorNode';
import type { RootNode } from '../nodes/RootNode';
import { SchemaCombinerName, SchemaNode, SchemaNodeKind } from '../nodes/types';
import type { SchemaFragment } from '../types';
import { isObjectLiteral } from '../utils/guards';
import type { WalkingOptions } from './types';

function* processFragment(
  fragment: SchemaFragment,
  path: string[],
  walkingOptions: WalkingOptions,
  processedFragments: WeakMap<SchemaFragment, SchemaNode>,
): IterableIterator<SchemaNode> {
  const processedFragment = processedFragments.get(fragment);
  if (processedFragment !== void 0) {
    return yield new MirrorNode(processedFragment);
  }

  if ('$ref' in fragment) {
    if (walkingOptions.resolveRef !== null && typeof fragment.$ref === 'string') {
      try {
        const seenRefs: string[] = [];
        while (typeof fragment.$ref === 'string') {
          if (seenRefs.includes(fragment.$ref)) {
            return yield new ReferenceNode(fragment, null);
          }

          seenRefs.push(fragment.$ref);
          fragment = walkingOptions.resolveRef(path, fragment.$ref);
        }
      } catch (ex) {
        return yield new ReferenceNode(fragment, ex.message);
      }
    } else {
      return yield new ReferenceNode(fragment, null);
    }
  }

  if (walkingOptions.mergeAllOf && SchemaCombinerName.AllOf in fragment) {
    try {
      fragment = mergeAllOf(fragment, path, walkingOptions);
    } catch {
      //
    }
  }

  if (SchemaCombinerName.OneOf in fragment || SchemaCombinerName.AnyOf in fragment) {
    try {
      for (const item of mergeOneOrAnyOf(fragment, path, walkingOptions)) {
        yield new RegularNode(item);
      }

      return;
    } catch {
      //
    }
  }

  yield new RegularNode(fragment);
}

type WalkerItem = {
  node: SchemaNode;
  parentNode: SchemaNode | null;
};

type WalkerSnapshot = {
  readonly fragment: SchemaFragment;
  readonly depth: number;
  readonly path: string[];
};

export class Walker extends EventEmitter<any> {
  public readonly path: string[];
  public depth: number;

  protected fragment: SchemaFragment;
  protected schemaNode: RegularNode | RootNode;

  private readonly processedFragments: WeakMap<SchemaFragment, SchemaNode>;

  constructor(protected readonly root: RootNode, protected readonly walkingOptions: WalkingOptions) {
    super();

    this.path = [];
    this.depth = -1;
    this.fragment = root.fragment;
    this.schemaNode = root;
    this.processedFragments = new WeakMap<SchemaFragment, SchemaNode>();
  }

  public stepIn: boolean = true;

  public *resume(snapshot: WalkerSnapshot) {
    this.path.splice(0, this.path.length, ...snapshot.path);
    this.depth = snapshot.depth;
    this.fragment = snapshot.fragment;

    yield* this.walk();
  }

  public pause(): WalkerSnapshot {
    return {
      depth: this.depth,
      fragment: this.fragment,
      path: this.path.slice(),
    };
  }

  public *walk(): IterableIterator<WalkerItem> {
    const {
      depth: initialDepth,
      schemaNode: initialSchemaNode,
      path: { length },
    } = this;

    for (const schemaNode of processFragment(this.fragment, this.path, this.walkingOptions, this.processedFragments)) {
      this.processedFragments.set(schemaNode.fragment, schemaNode);

      this.fragment = schemaNode.fragment;
      this.depth = initialDepth + 1;

      super.emit('enter', schemaNode);

      schemaNode.parent = initialSchemaNode;
      // @ts-ignore
      schemaNode.subpath = this.path.slice(initialSchemaNode.path.length);

      if ('children' in initialSchemaNode) {
        if (initialSchemaNode.children === null) {
          (initialSchemaNode as RegularNode).children = [schemaNode];
        } else {
          initialSchemaNode.children.push(schemaNode);
        }
      }

      if (!(schemaNode instanceof RegularNode)) continue;

      this.schemaNode = schemaNode;

      if (this.stepIn) {
        yield* this.walkNodeChildren();
      }

      super.emit('exit');
    }

    this.path.length = length;
    this.depth = initialDepth;
    this.schemaNode = initialSchemaNode;
  }

  protected *walkNodeChildren() {
    const { fragment, schemaNode } = this;

    if (!(schemaNode instanceof RegularNode)) return;

    const {
      depth: initialDepth,
      schemaNode: initialSchemaNode,
      path: { length },
    } = this;

    // todo: combiner
    if (schemaNode.combiners !== null) {
      for (const combiner of schemaNode.combiners) {
        const items = fragment[combiner];
        if (!Array.isArray(items)) continue;

        let i = -1;
        for (const item of items) {
          i++;
          if (!isObjectLiteral(item)) continue;
          this.fragment = item;
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
}
