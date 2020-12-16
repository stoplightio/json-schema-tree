import {
  MirroredReferenceNode,
  MirroredRegularNode,
  MirroredSchemaNode,
  ReferenceNode,
  RegularNode,
  RootNode,
  SchemaNode,
} from '../nodes';

export function isSchemaNode(node: unknown): node is SchemaNode {
  const name = Object.getPrototypeOf(node).constructor.name;
  return (
    name === RootNode.name ||
    name === RegularNode.name ||
    name === MirroredRegularNode.name ||
    name === ReferenceNode.name ||
    name === MirroredReferenceNode.name
  );
}

export function isRootNode(node: SchemaNode): node is RootNode {
  return Object.getPrototypeOf(node).constructor.name === 'RootNode';
}

export function isRegularNode(node: SchemaNode): node is RegularNode {
  return 'types' in node && 'primaryType' in node && 'combiners' in node;
}

export function isMirroredNode(node: SchemaNode): node is MirroredSchemaNode {
  return 'mirroredNode' in node;
}

export function isReferenceNode(node: SchemaNode): node is ReferenceNode {
  return 'external' in node && 'value' in node;
}
