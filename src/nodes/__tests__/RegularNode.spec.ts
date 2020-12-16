import { MirroredRegularNode } from '../mirrored';
import { ReferenceNode } from '../ReferenceNode';
import { RegularNode } from '../RegularNode';

describe('RegularNode node', () => {
  it('should have a working Symbol.hasInstance trait', () => {
    const regularNode = new RegularNode({ type: 'string' });
    const mirroredNode = new MirroredRegularNode(regularNode);

    expect(mirroredNode instanceof RegularNode).toBe(true);
    expect(regularNode instanceof RegularNode).toBe(true);
    expect(mirroredNode instanceof ReferenceNode).toBe(false);
    expect(regularNode instanceof ReferenceNode).toBe(false);
  });
});
