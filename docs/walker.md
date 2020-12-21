# Walker

Walker is responsible for traversing the schema and fills the tree with nodes.

A good example of robust integration can be found
[here](https://github.com/stoplightio/json-schema-viewer/blob/4cc585424390459bf27c41e2818343a6d5bf249e/src/tree/tree.ts).

## Hooks

- `filter` - can be leveraged in case you do not care about certain kinds of schemas, i.e. anyOf or oneOf in OAS2.
- `stepIn` - can be used if you do not wish to enter a given child. Useful for JSV and alike when you want to process N
  level of tree.

## Events

Walker emits a number of events to

```ts
export type WalkerNodeEventHandler = (node: SchemaNode) => void;
export type WalkerFragmentEventHandler = (node: SchemaFragment) => void;
export type WalkerErrorEventHandler = (ex: Error) => void;

export type WalkerEmitter = {
  enterNode: WalkerNodeEventHandler; // emitted right after a node is created
  exitNode: WalkerNodeEventHandler; // emitted when a given node is fully processed

  includeNode: WalkerNodeEventHandler; // emitted when filter hook does not exist or returns a true value
  skipNode: WalkerNodeEventHandler; // emitted when filter hook returns false value and therefore node is skipped

  stepInNode: WalkerNodeEventHandler; // dispatched when we step into a given node (i.e object, array, or combiner)
  stepOutNode: WalkerNodeEventHandler; // emitted when we are on the top level again
  stepOverNode: WalkerNodeEventHandler; // emitted when stepIn hook returned a false value

  enterFragment: WalkerFragmentEventHandler; // dispatched when a given schema fragment is about to processed
  exitFragment: WalkerFragmentEventHandler; // dispatched when a particular schema fragment is fully processed

  error: WalkerErrorEventHandler; // any meaningful error such as allOf merging error or resolving error
};
```

## Expanding

```js
// Make sure that both `filter` and `stepIn` hook do not intefere.

tree.walker.restoreWalkerAtNode(someNodeToExpand);
tree.populate();
```
