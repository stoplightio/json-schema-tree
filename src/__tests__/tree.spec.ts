import * as fastGlob from 'fast-glob';
import * as fs from 'fs';
import type { JSONSchema4 } from 'json-schema';
import * as path from 'path';

import { isRegularNode } from '../guards';
import type { RegularNode } from '../nodes';
import { SchemaTree } from '../tree';
import { printTree } from './utils/printTree';

describe('SchemaTree', () => {
  describe('output', () => {
    it.each(
      fastGlob.sync('**/*.json', {
        cwd: path.join(__dirname, '__fixtures__'),
        ignore: ['stress-schema.json'],
      }),
    )('should generate valid tree for %s', async filename => {
      const schema = JSON.parse(await fs.promises.readFile(path.resolve(__dirname, '__fixtures__', filename), 'utf8'));
      expect(printTree(schema)).toMatchSnapshot();
    });

    describe('allOf failures', () => {
      it('given incompatible values, should bail out and display unmerged allOf', () => {
        const schema: JSONSchema4 = {
          allOf: [
            {
              type: 'string',
            },
            {
              type: 'number',
            },
            {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                },
              },
            },
          ],
        };

        expect(printTree(schema)).toMatchInlineSnapshot(`
                  "└─ #
                     ├─ combiners
                     │  └─ 0: allOf
                     └─ children
                        ├─ 0
                        │  └─ #/allOf/0
                        │     ├─ types
                        │     │  └─ 0: string
                        │     └─ primaryType: string
                        ├─ 1
                        │  └─ #/allOf/1
                        │     ├─ types
                        │     │  └─ 0: number
                        │     └─ primaryType: number
                        └─ 2
                           └─ #/allOf/2
                              ├─ types
                              │  └─ 0: object
                              ├─ primaryType: object
                              └─ children
                                 └─ 0
                                    └─ #/allOf/2/properties/name
                                       ├─ types
                                       │  └─ 0: string
                                       └─ primaryType: string
                  "
              `);
      });
    });

    describe('eager $ref resolving', () => {
      it('given a plain object with properties, should resolve', () => {
        const schema: JSONSchema4 = {
          type: 'object',
          properties: {
            foo: {
              $ref: '#/properties/bar',
            },
            bar: {
              type: 'boolean',
            },
          },
        };

        expect(printTree(schema)).toMatchInlineSnapshot(`
          "└─ #
             ├─ types
             │  └─ 0: object
             ├─ primaryType: object
             └─ children
                ├─ 0
                │  └─ #/properties/foo
                │     ├─ types
                │     │  └─ 0: boolean
                │     └─ primaryType: boolean
                └─ 1
                   └─ #/properties/bar
                      └─ mirrors: #/properties/foo
          "
        `);
      });

      it('preserves the original $ref info', () => {
        const schema: JSONSchema4 = {
          type: 'object',
          properties: {
            foo: {
              $ref: '#/properties/bar',
            },
            bar: {
              type: 'boolean',
            },
          },
        };

        const tree = new SchemaTree(schema);
        tree.populate();

        const topLevelObject = tree.root.children[0] as RegularNode;
        const fooObj = topLevelObject.children!.find(child => child.path[child.path.length - 1] === 'foo')!;
        expect(isRegularNode(fooObj) && fooObj.originalFragment.$ref).toBe('#/properties/bar');
      });

      it('given an array with $reffed items, should resolve', () => {
        const schema: JSONSchema4 = {
          type: 'object',
          properties: {
            foo: {
              type: 'array',
              items: {
                $ref: '#/properties/bar',
              },
            },
            bar: {
              type: 'boolean',
            },
          },
        };

        expect(printTree(schema)).toMatchInlineSnapshot(`
          "└─ #
             ├─ types
             │  └─ 0: object
             ├─ primaryType: object
             └─ children
                ├─ 0
                │  └─ #/properties/foo
                │     ├─ types
                │     │  └─ 0: array
                │     ├─ primaryType: array
                │     └─ children
                │        └─ 0
                │           └─ #/properties/foo/items
                │              ├─ types
                │              │  └─ 0: boolean
                │              └─ primaryType: boolean
                └─ 1
                   └─ #/properties/bar
                      └─ mirrors: #/properties/foo/items
          "
        `);
      });

      it('should leave broken $refs', () => {
        const schema: JSONSchema4 = {
          type: 'object',
          properties: {
            foo: {
              type: 'array',
              items: {
                $ref: '#/properties/baz',
              },
            },
            bar: {
              $ref: '#/properties/bazinga',
            },
          },
        };

        expect(printTree(schema)).toMatchInlineSnapshot(`
          "└─ #
             ├─ types
             │  └─ 0: object
             ├─ primaryType: object
             └─ children
                ├─ 0
                │  └─ #/properties/foo
                │     ├─ types
                │     │  └─ 0: array
                │     ├─ primaryType: array
                │     └─ children
                │        └─ 0
                │           └─ #/properties/foo/items
                │              ├─ $ref: #/properties/baz
                │              ├─ external: false
                │              └─ error: Could not resolve '#/properties/baz'
                └─ 1
                   └─ #/properties/bar
                      ├─ $ref: #/properties/bazinga
                      ├─ external: false
                      └─ error: Could not resolve '#/properties/bazinga'
          "
        `);
      });

      it('should handle circular references', () => {
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

        expect(printTree(schema)).toMatchInlineSnapshot(`
          "└─ #
             ├─ types
             │  └─ 0: object
             ├─ primaryType: object
             └─ children
                ├─ 0
                │  └─ #/properties/foo
                │     ├─ types
                │     │  └─ 0: array
                │     ├─ primaryType: array
                │     └─ children
                │        └─ 0
                │           └─ #/properties/foo/items
                │              ├─ types
                │              │  └─ 0: object
                │              ├─ primaryType: object
                │              └─ children
                │                 └─ 0
                │                    └─ #/properties/foo/items/properties/user
                │                       └─ mirrors: #/properties/foo
                ├─ 1
                │  └─ #/properties/bar
                │     └─ mirrors: #/properties/foo
                └─ 2
                   └─ #/properties/baz
                      └─ mirrors: #/properties/foo
          "
        `);
      });

      it('should handle circular references pointing at parents', () => {
        const schema: JSONSchema4 = {
          properties: {
            bar: {
              properties: {
                foo: {
                  type: 'string',
                },
                baz: {
                  $ref: '#/properties/bar',
                },
              },
            },
          },
        };

        expect(printTree(schema)).toMatchInlineSnapshot(`
          "└─ #
             ├─ types
             │  └─ 0: object
             ├─ primaryType: object
             └─ children
                └─ 0
                   └─ #/properties/bar
                      ├─ types
                      │  └─ 0: object
                      ├─ primaryType: object
                      └─ children
                         ├─ 0
                         │  └─ #/properties/bar/properties/foo
                         │     ├─ types
                         │     │  └─ 0: string
                         │     └─ primaryType: string
                         └─ 1
                            └─ #/properties/bar/properties/baz
                               └─ mirrors: #/properties/bar
          "
        `);
      });

      it('should handle circular references pointing at document', () => {
        const schema: JSONSchema4 = {
          title: 'root',
          properties: {
            bar: {
              properties: {
                baz: {
                  $ref: '#',
                },
              },
            },
          },
        };

        expect(printTree(schema)).toMatchInlineSnapshot(`
          "└─ #
             ├─ types
             │  └─ 0: object
             ├─ primaryType: object
             └─ children
                └─ 0
                   └─ #/properties/bar
                      ├─ types
                      │  └─ 0: object
                      ├─ primaryType: object
                      └─ children
                         └─ 0
                            └─ #/properties/bar/properties/baz
                               └─ mirrors: #
          "
        `);
      });

      // it('should handle resolving errors', () => {
      //   const schema: JSONSchema4 = {
      //     type: 'object',
      //     properties: {
      //       foo: {
      //         type: 'string',
      //       },
      //       bar: {
      //         $ref: 'http://localhost:8080/some/not/existing/path',
      //       },
      //     },
      //   };
      //
      //   const tree = new SchemaTree(schema, new SchemaTreeState(), {
      //     expandedDepth: Infinity,
      //     mergeAllOf: true,
      //     resolveRef: () => {
      //       throw new Error('resolving error');
      //     },
      //     shouldResolveEagerly: true,
      //     onPopulate: void 0,
      //   });
      //
      //   tree.populate();
      //
      //   expect(tree.count).toEqual(4);
      //   expect(getNodeMetadata(tree.itemAt(3)!)).toHaveProperty('error', 'resolving error');
      // });
    });

    it('given multiple object and string type, should process properties', () => {
      const schema: JSONSchema4 = {
        type: ['string', 'object'],
        properties: {
          ids: {
            type: 'array',
            items: {
              type: 'integer',
            },
          },
        },
      };

      expect(printTree(schema)).toMatchInlineSnapshot(`
        "└─ #
           ├─ types
           │  ├─ 0: string
           │  └─ 1: object
           ├─ primaryType: object
           └─ children
              └─ 0
                 └─ #/properties/ids
                    ├─ types
                    │  └─ 0: array
                    ├─ primaryType: array
                    └─ children
                       └─ 0
                          └─ #/properties/ids/items
                             ├─ types
                             │  └─ 0: integer
                             └─ primaryType: integer
        "
      `);
    });

    describe.each(['anyOf', 'oneOf'])('given %s combiner placed next to allOf', combiner => {
      let schema: JSONSchema4;

      beforeEach(() => {
        schema = {
          type: 'object',
          title: 'Account',
          allOf: [
            {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['admin', 'editor'],
                },
                enabled: {
                  type: 'boolean',
                  description: 'Is this account enabled',
                },
              },
              required: ['type'],
            },
          ],
          [combiner]: [
            {
              type: 'object',
              title: 'Admin',
              properties: {
                root: {
                  type: 'boolean',
                },
                group: {
                  type: 'string',
                },
                expirationDate: {
                  type: 'string',
                },
              },
            },
            {
              type: 'object',
              title: 'Editor',
              properties: {
                supervisor: {
                  type: 'string',
                },
                key: {
                  type: 'string',
                },
              },
            },
          ],
        };
      });

      it('given allOf merging disabled, should still merge', () => {
        expect(printTree(schema, { mergeAllOf: false })).toMatchSnapshot();
      });

      it('given allOf merging enabled, should merge contents of allOf combiners', () => {
        expect(printTree(schema)).toMatchSnapshot();
      });
    });

    it('given array with oneOf containing items, should merge it correctly', () => {
      const schema: JSONSchema4 = {
        oneOf: [
          {
            items: {
              type: 'string',
            },
          },
          {
            items: {
              type: 'number',
            },
          },
        ],
        type: 'array',
      };

      expect(printTree(schema)).toMatchInlineSnapshot(`
        "└─ #
           ├─ combiners
           │  └─ 0: oneOf
           └─ children
              ├─ 0
              │  └─ #/oneOf/0
              │     ├─ types
              │     │  └─ 0: array
              │     ├─ primaryType: array
              │     └─ children
              │        └─ 0
              │           └─ #/oneOf/0/items
              │              ├─ types
              │              │  └─ 0: string
              │              └─ primaryType: string
              └─ 1
                 └─ #/oneOf/1
                    ├─ types
                    │  └─ 0: array
                    ├─ primaryType: array
                    └─ children
                       └─ 0
                          └─ #/oneOf/1/items
                             ├─ types
                             │  └─ 0: number
                             └─ primaryType: number
        "
      `);
    });

    it('given empty schema, should output empty tree', () => {
      expect(printTree({})).toEqual('');
    });
  });

  describe('mirroring', () => {
    describe('circular references', () => {
      it('should self expand', () => {
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

        expect(
          // @ts-ignore
          tree.root.children[0].children[2].children[0].children[0].children[0].parent ===
            // @ts-ignore
            tree.root.children[0].children[2].children[0].children[0],
        ).toBe(true);

        // @ts-ignore
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
        // @ts-ignore
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

        // todo: add some more assertions here
      });
    });
  });
});
