import { MirroredReferenceNode } from '../mirrored';
import { ReferenceNode } from '../ReferenceNode';
import { RegularNode } from '../RegularNode';

describe('ReferenceNode node', () => {
  it('should have a working Symbol.hasInstance trait', () => {
    const referenceNode = new ReferenceNode({ $ref: '' }, null);
    const mirroredNode = new MirroredReferenceNode(referenceNode);

    expect(mirroredNode instanceof ReferenceNode).toBe(true);
    expect(referenceNode instanceof ReferenceNode).toBe(true);
    expect(mirroredNode instanceof RegularNode).toBe(false);
    expect(referenceNode instanceof RegularNode).toBe(false);
  });
});
