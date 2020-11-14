import { pathToPointer } from '@stoplight/json';
import * as treeify from 'treeify';

import { MirrorNode, ReferenceNode, RegularNode, SchemaNode } from '../../nodes';
import type { SchemaTreeOptions } from '../../tree';
import { SchemaTree } from '../../tree';
import type { SchemaFragment } from '../../types';

export function printTree(schema: SchemaFragment, opts?: Partial<SchemaTreeOptions>) {
  const tree = new SchemaTree(schema, opts);
  tree.populate();

  const root: unknown =
    tree.root.children.length > 1
      ? tree.root.children.map(prepareTree, new WeakSet())
      : prepareTree.call(new WeakSet(), tree.root.children[0]);

  return treeify.asTree(root as treeify.TreeObject, true, true);
}

function printRegularNode(this: WeakSet<SchemaNode>, node: RegularNode): any {
  return {
    ...(node.types !== null ? { types: node.types } : null),
    ...(node.primaryType !== null ? { primaryType: node.primaryType } : null),
    ...(node.combiners !== null ? { combiners: node.combiners } : null),
    ...(node.children !== null ? { children: node.children.map(prepareTree, this) } : null),
  };
}

function printReferenceNode(node: ReferenceNode) {
  return {
    $ref: node.value,
    external: node.external,
    ...(node.error !== null ? { error: node.error } : null),
  };
}

function printMirrorNode(this: WeakSet<SchemaNode>, node: MirrorNode): any {
  if (this.has(node.mirrors)) {
    return {
      mirrors: pathToPointer(node.path as string[]),
    };
  }

  this.add(node.mirrors);
  return printNode.call(this, node.mirrors);
}

function printNode(this: WeakSet<SchemaNode>, node: SchemaNode) {
  return node instanceof RegularNode
    ? printRegularNode.call(this, node)
    : node instanceof ReferenceNode
    ? printReferenceNode.call(this, node)
    : node instanceof MirrorNode
    ? printMirrorNode.call(this, node)
    : {
        kind: 'unknown node',
      };
}

function prepareTree(this: WeakSet<SchemaNode>, node: SchemaNode) {
  return {
    [pathToPointer(node.path as string[])]: printNode.call(this, node),
  };
}
