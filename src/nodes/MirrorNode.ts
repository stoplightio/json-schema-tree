import { BaseNode } from './BaseNode';
import type { SchemaNode } from './types';

export class MirrorNode extends BaseNode {
  constructor(public readonly mirrors: SchemaNode) {
    super(mirrors.fragment);
  }

  public get children(): MirrorNode[] | null {
    if (!('children' in this.mirrors)) return null;

    const referencedChildren = this.mirrors.children;
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
