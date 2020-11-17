import type { MirroredSchemaNode, ReferenceNode, RegularNode, SchemaNode } from '../nodes';

export function isRegularNode(node: SchemaNode): node is RegularNode {
  return 'types' in node && 'primaryType' in node && 'combiners' in node;
}

export function isMirroredNode(node: SchemaNode): node is MirroredSchemaNode {
  return 'mirroredNode' in node;
}

export function isReferenceNode(node: SchemaNode): node is ReferenceNode {
  return 'external' in node && 'value' in node;
}
