import type { Dictionary } from '@stoplight/types';

import { BaseNode } from './BaseNode';
import type { RegularNode } from './RegularNode';
import type { SchemaAnnotations, SchemaCombinerName, SchemaMeta, SchemaNode, SchemaNodeKind } from './types';

export class MirrorNode extends BaseNode implements RegularNode {
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

  constructor(public readonly mirroredNode: SchemaNode) {
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

  public get children(): MirrorNode[] | null {
    if (!('children' in this.mirroredNode)) return null;

    const referencedChildren = this.mirroredNode.children;
    if (referencedChildren === null) return null;

    const children: MirrorNode[] = [];
    for (const child of referencedChildren) {
      const mirroredChild = new MirrorNode(child);
      mirroredChild.parent = this;
      mirroredChild.subpath = child.subpath;
      children.push(mirroredChild);
    }

    return children;
  }
}
