# Tree

Currently, the tree may contain up to 5 kinds of nodes.

- RootNode - a single tree cannot have more than a single instance of RootNode
- RegularNode and MirroredRegularNode - used for everything other than a schema fragment containing a `$ref`
- ReferenceNode and MirroredReferenceNode - used only for fragments with a `$ref` included

## Mirroring - mirrored nodes

Although the name might sound a bit odd, it is exactly what these nodes are. They literally represent their standard
variant. Mirrored nodes are used to represent the same portion of schema fragment. However, there are properties that do
vary. These are `id` and `children`. Each node has always unique `id`, regardless of their type. Moreover, to avoid
entering some infinite loop, `children` (if any) are processed shallowly.

For a more end-to-end example, I encourage you to execute the sample provided below in [circular $refs](#circular-refs)
section.

### Caution

**DO NOT** use `instanceof` checks for verifying whether a particular node is of a regular kind. Each regular node has
`Symbol.hasInstance` trait implemented that will return true if you use a regular or mirrored sort of node on the RHS of
condition.

```
myNode instanceof RegularNode; // DO NOT DO IT

if (!isMirroredNode(myNode)) {
  // this is okay
}
```

Do note that the fact a mirrored node exists in tree does not necessarily mean the tree has no boundaries. Mirrored
nodes are also used for fragments that were already processed previously.

## $refs

### Resolving

By default, we attempt to resolve all local $refs leveraging `resolveInlineRef` util from `@stoplight/json`. If you wish
to provide a custom resolver, you can supply a `resolver` option to a tree.

```js
import { SchemaTree } from '@stoplight/json-schema-tree';

const tree = new SchemaTree(schema, {
  refResolver(ref, propertyPath, fragment) {
    // ref has a pointer and a source
    // do something or throw if resolving cannot be performed
  },
});
```

Retaining all $refs in tree is possible as well. In such case, you should pass `null` as the value of `refResolver`.

```js
import { SchemaTree } from '@stoplight/json-schema-tree';

const tree = new SchemaTree(schema, {
  refResolver: null, // I will not try to resolve any $refs
});
```

It is worth mentioning that we do not resolve the whole schema upfront. $refs are resolved only when they are actually
seen (processed) during the traversal.

### Circular $refs

If your schema contains circular $refs, certain branches of tree will have mirrored nodes as some of their leaf nodes.
That said, the size of the tree will be infinite.

#### Example schema with indirect circular references

```json
{
  "type": "object",
  "properties": {
    "foo": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "user": {
            "$ref": "#/properties/bar"
          }
        }
      }
    },
    "bar": {
      "$ref": "#/properties/baz"
    },
    "baz": {
      "$ref": "#/properties/foo"
    }
  }
}
```

```js
import { SchemaTree } from '@stoplight/json-schema-tree';

const tree = new SchemaTree(schema);
tree.populate();

expect(tree.root.children[0].children[0].children[0].children[0].children[0].children[0].path).toEqual([
  'properties',
  'foo',
  'items',
  'properties',
  'user',
  'items',
  'properties',
  'user',
]);
expect(tree.root.children[0].children[2].children[0].children[0].children[0].children[0].path).toEqual([
  'properties',
  'baz',
  'items',
  'properties',
  'user',
  'items',
  'properties',
  'user',
]);

// etc.
```

**CAUTION**

Always use `isMirroredNode` guard when traversing the processed tree. If you forget to do it, you will enter recursive
loops at times.

```js
function traverse(node) {
  if (isMirroredNode(node)) {
    // alright, it's a mirrored node, I can do something with it
  } else {
    // continue
  }
}
```
