import type { Dictionary } from '@stoplight/types';

import { isMirroredNode, isRegularNode } from '../../guards';
import { BaseNode } from '../BaseNode';
import type { RegularNode } from '../RegularNode';
import type { SchemaAnnotations, SchemaCombinerName, SchemaMeta, SchemaNodeKind } from '../types';
import { MirroredReferenceNode } from './MirroredReferenceNode';

export class MirroredRegularNode extends BaseNode implements RegularNode {
  public readonly types!: SchemaNodeKind[] | null;
  public readonly primaryType!: SchemaNodeKind | null;
  public readonly combiners!: SchemaCombinerName[] | null;

  public readonly required!: string[] | null;
  public readonly enum!: unknown[] | null;
  public readonly format!: string | null;
  public readonly title!: string | null;
  public readonly deprecated!: boolean;

  public readonly meta!: Readonly<Partial<Dictionary<unknown, SchemaMeta>>>;
  public readonly annotations!: Readonly<Partial<Dictionary<unknown, SchemaAnnotations>>>;
  public readonly validations!: Readonly<Dictionary<unknown>>;

  public readonly simple!: boolean;

  constructor(public readonly mirroredNode: RegularNode) {
    super(mirroredNode.fragment);

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
  private _children?: (MirroredRegularNode | MirroredReferenceNode)[] | null;

  public get children(): (MirroredRegularNode | MirroredReferenceNode)[] | null {
    if (this._children !== void 0) {
      return this._children;
    }

    if (!('children' in this.mirroredNode)) {
      this._children = null;
      return null;
    }

    const referencedChildren = this.mirroredNode.children;
    if (referencedChildren === null) {
      this._children = null;
      return null;
    }

    const children: (MirroredRegularNode | MirroredReferenceNode)[] = [];
    for (const child of referencedChildren) {
      // this is to avoid pointing at nested mirroring
      const actualChild = isMirroredNode(child) ? child.mirroredNode : child;
      const mirroredChild = isRegularNode(actualChild)
        ? new MirroredRegularNode(actualChild)
        : new MirroredReferenceNode(actualChild);

      mirroredChild.parent = this._this;
      mirroredChild.subpath = actualChild.subpath;
      children.push(mirroredChild);
    }

    this._children = children;
    return children;
  }
}
