import type { Dictionary } from '@stoplight/types';

import { isRegularNode } from '../../guards';
import type { SchemaFragment } from '../../types';
import { isNonNullable } from '../../utils';
import { BaseNode } from '../BaseNode';
import type { ReferenceNode } from '../ReferenceNode';
import type { RegularNode } from '../RegularNode';
import type { SchemaAnnotations, SchemaCombinerName, SchemaNodeKind } from '../types';
import { MirroredReferenceNode } from './MirroredReferenceNode';

export class MirroredRegularNode extends BaseNode implements RegularNode {
  public readonly $id!: string | null;
  public readonly types!: SchemaNodeKind[] | null;
  public readonly primaryType!: SchemaNodeKind | null;
  public readonly combiners!: SchemaCombinerName[] | null;

  public readonly required!: string[] | null;
  public readonly enum!: unknown[] | null;
  public readonly format!: string | null;
  public readonly title!: string | null;
  public readonly deprecated!: boolean;

  public readonly annotations!: Readonly<Partial<Dictionary<unknown, SchemaAnnotations>>>;
  public readonly validations!: Readonly<Dictionary<unknown>>;
  public readonly originalFragment!: SchemaFragment;

  public readonly simple!: boolean;
  public readonly unknown!: boolean;

  private readonly cache: WeakMap<RegularNode | ReferenceNode, MirroredRegularNode | MirroredReferenceNode>;

  constructor(public readonly mirroredNode: RegularNode) {
    super(mirroredNode.fragment);

    this.cache = new WeakMap();

    this._this = new Proxy(this, {
      get(target, key) {
        if (key in target) {
          return target[key];
        }

        if (key in mirroredNode) {
          return Reflect.get(mirroredNode, key, mirroredNode);
        }

        return;
      },

      has(target, key) {
        return key in target || key in mirroredNode;
      },
    });

    return this._this;
  }

  private readonly _this: MirroredRegularNode;

  private _children?: (MirroredRegularNode | MirroredReferenceNode)[];

  public get children(): (MirroredRegularNode | MirroredReferenceNode)[] | null | undefined {
    const referencedChildren = this.mirroredNode.children;

    if (!isNonNullable(referencedChildren)) {
      return referencedChildren;
    }

    if (this._children === void 0) {
      this._children = [];
    } else {
      this._children.length = 0;
    }

    const children: (MirroredRegularNode | MirroredReferenceNode)[] = this._children;
    for (const child of referencedChildren) {
      // this is to avoid pointing at nested mirroring
      const cached = this.cache.get(child);

      if (cached !== void 0) {
        children.push(cached);
        continue;
      }

      const mirroredChild = isRegularNode(child) ? new MirroredRegularNode(child) : new MirroredReferenceNode(child);

      mirroredChild.parent = this._this;
      mirroredChild.subpath = child.subpath;
      this.cache.set(child, mirroredChild);
      children.push(mirroredChild);
    }

    return children;
  }
}
