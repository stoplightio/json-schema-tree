import { pathToPointer } from '@stoplight/json';
import type { Dictionary } from '@stoplight/types';
import * as treeify from 'treeify';

import { isMirroredNode, isReferenceNode, isRegularNode } from '../../guards';
import type { MirroredSchemaNode, ReferenceNode, RegularNode, SchemaNode } from '../../nodes';
import type { SchemaTreeOptions } from '../../tree';
import { SchemaTree } from '../../tree';
import type { SchemaFragment } from '../../types';
import { isNonNullable } from '../../utils';

export function printTree(schema: SchemaFragment, opts?: Partial<SchemaTreeOptions>) {
  const tree = new SchemaTree(schema, opts);
  tree.populate();

  const root: unknown =
    tree.root.children.length > 1
      ? tree.root.children.map(child => prepareTree(child))
      : tree.root.children.length === 1
      ? prepareTree(tree.root.children[0])
      : {};

  return treeify.asTree(root as treeify.TreeObject, true, true);
}

function printRegularNode(node: RegularNode): Dictionary<unknown> {
  return {
    ...(node.types !== null ? { types: node.types } : null),
    ...(node.primaryType !== null ? { primaryType: node.primaryType } : null),
    ...(node.combiners !== null ? { combiners: node.combiners } : null),
    ...(node.enum !== null ? { enum: node.enum } : null),
    ...(isNonNullable(node.children) ? { children: node.children.map(prepareTree) } : null),
  };
}

function printReferenceNode(node: ReferenceNode) {
  return {
    $ref: node.value,
    external: node.external,
    ...(node.error !== null ? { error: node.error } : null),
  };
}

function printMirrorNode(node: MirroredSchemaNode): any {
  return {
    mirrors: pathToPointer(node.mirroredNode.path as string[]),
  };
}

function printNode(node: SchemaNode) {
  return isMirroredNode(node)
    ? printMirrorNode(node)
    : isRegularNode(node)
    ? printRegularNode(node)
    : isReferenceNode(node)
    ? printReferenceNode(node)
    : {
        kind: 'unknown node',
      };
}

function prepareTree(node: SchemaNode) {
  return {
    [pathToPointer(node.path as string[])]: printNode(node),
  };
}
