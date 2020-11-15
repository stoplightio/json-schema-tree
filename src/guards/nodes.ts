import type { MirrorNode, ReferenceNode, RegularNode, SchemaNode } from '../nodes';

export function isRegularNode(node: SchemaNode): node is RegularNode {
  return 'types' in node && 'primaryType' in node && 'combiners' in node;
}

export function isMirrorNode(node: SchemaNode): node is MirrorNode {
  return 'mirroredNode' in node;
}

export function isReferenceNode(node: SchemaNode): node is ReferenceNode {
  return 'external' in node && 'value' in node;
}
