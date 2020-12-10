# @stoplight/json-schema-tree

<!-- BADGES -->

### Use cases

- json-schema-viewer
- json-schema-editor
- masking

### Installation

Supported in modern browsers and Node.JS (>=10.18).

```bash
# latest stable
yarn add @stoplight/json-schema-tree
```

### Usage

```ts
import { SchemaTree } from '@stoplight/json-schema-tree';

const tree = new SchemaTree(mySchema);

const snapshots = [];
let allowedDepth = 4;

tree.walker.hookInto('stepIn', node => {
  return tree.walker.depth >= allowedDepth;
});

tree.walker.hookInto('filter', node => {
  return !!node.type?.includes('integer'); // if a schema property is of type integer, it won't be included in the tree
});

tree.walker.on('newNode', node => {
  // new node in fragment is about to be processed
});

tree.walker.on('enterNode', node => {
  // node has some children we'll process
});

tree.walker('exitNode', node => {
  // node processed
});

tree.populate();

tree.root; // populated tree

allowedDepth++;
tree.invokeWalker(tree.walker.resume(snapshots[0])); // resumes, useful for jsv (expand)
```

#### General tree structure

The tree self expands if a schema we build tree for has circular $refs.

Example

```ts
const schema: JSONSchema4 = {
  type: 'object',
  properties: {
    foo: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          user: {
            $ref: '#/properties/bar',
          },
        },
      },
    },
    bar: {
      $ref: '#/properties/baz',
    },
    baz: {
      $ref: '#/properties/foo',
    },
  },
};

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
```

### Contributing

1. Clone repo.
2. Create / checkout `feature/{name}`, `chore/{name}`, or `fix/{name}` branch.
3. Install deps: `yarn`.
4. Make your changes.
5. Run tests: `yarn test.prod`.
6. Stage relevant files to git.
7. Commit: `yarn commit`. _NOTE: Commits that don't follow the [conventional](https://github.com/marionebl/commitlint/tree/master/%40commitlint/config-conventional) format will be rejected. `yarn commit` creates this format for you, or you can put it together manually and then do a regular `git commit`._
8. Push: `git push`.
9. Open PR targeting the `master` branch.
