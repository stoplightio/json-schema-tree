import type { Dictionary } from '@stoplight/types';

import { isRegularNode } from '../../guards';
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

    return new Proxy(this, {
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
  }

  public get children(): (MirroredRegularNode | MirroredReferenceNode)[] | null {
    if (!('children' in this.mirroredNode)) return null;

    const referencedChildren = this.mirroredNode.children;
    if (referencedChildren === null) return null;

    const children: (MirroredRegularNode | MirroredReferenceNode)[] = [];
    for (const child of referencedChildren) {
      const mirroredChild = isRegularNode(child) ? new MirroredRegularNode(child) : new MirroredReferenceNode(child);
      mirroredChild.parent = this;
      mirroredChild.subpath = child.subpath;
      children.push(mirroredChild);
    }

    return children;
  }
}
