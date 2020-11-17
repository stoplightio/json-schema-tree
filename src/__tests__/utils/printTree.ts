import { pathToPointer } from '@stoplight/json';
import type { Dictionary } from '@stoplight/types';
import * as treeify from 'treeify';

import { isMirroredNode, isRegularNode } from '../../guards';
import { MirroredSchemaNode, ReferenceNode, RegularNode, SchemaNode } from '../../nodes';
import type { SchemaTreeOptions } from '../../tree';
import { SchemaTree } from '../../tree';
import type { SchemaFragment } from '../../types';

export function printTree(schema: SchemaFragment, opts?: Partial<SchemaTreeOptions>) {
  const tree = new SchemaTree(schema, opts);
  tree.populate();

  const root: unknown =
    tree.root.children.length > 1
      ? tree.root.children.map(child => prepareTree.call(new WeakSet(), child))
      : prepareTree.call(new WeakSet(), tree.root.children[0]);

  return treeify.asTree(root as treeify.TreeObject, true, true);
}

function printRegularNode(this: WeakSet<SchemaFragment>, node: RegularNode): Dictionary<unknown> {
  return {
    ...(node.types !== null ? { types: node.types } : null),
    ...(node.primaryType !== null ? { primaryType: node.primaryType } : null),
    ...(node.combiners !== null ? { combiners: node.combiners } : null),
    ...(node.enum !== null ? { enum: node.enum } : null),
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

function printMirrorNode(this: WeakSet<SchemaFragment>, node: MirroredSchemaNode): any {
  if (this.has(node.fragment)) {
    return {
      mirrors: pathToPointer(node.mirroredNode.path as string[]),
    };
  }

  this.add(node.fragment);
  return isRegularNode(node) ? printRegularNode.call(this, node) : printReferenceNode.call(this, node);
}

function printNode(this: WeakSet<SchemaFragment>, node: SchemaNode) {
  return isMirroredNode(node)
    ? printMirrorNode.call(this, node)
    : node instanceof RegularNode
    ? printRegularNode.call(this, node)
    : node instanceof ReferenceNode
    ? printReferenceNode.call(this, node)
    : {
        kind: 'unknown node',
      };
}

function prepareTree(this: WeakSet<SchemaFragment>, node: SchemaNode) {
  return {
    [pathToPointer(node.path as string[])]: printNode.call(this, node),
  };
}
