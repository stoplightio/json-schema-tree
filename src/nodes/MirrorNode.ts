import { BaseNode } from './BaseNode';
import type { SchemaNode } from './types';

export class MirrorNode extends BaseNode {
  constructor(public readonly references: SchemaNode) {
    super(references.fragment);
  }

  public get children(): MirrorNode[] | null {
    if (!('children' in this.references)) return null;

    const referencedChildren = this.references.children;
    if (referencedChildren === null) return null;

    const children: MirrorNode[] = [];
    for (const child of referencedChildren) {
      const mirroredChild = new MirrorNode(child);
      mirroredChild.parent = this;
      children.push(mirroredChild);
    }

    return children;
  }
}
