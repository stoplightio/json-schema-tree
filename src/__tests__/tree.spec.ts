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

    describe('compound keywords', () => {
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

      describe('allOf handling', () => {
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

        it('should handle simple circular $refs', () => {
          const schema = {
            title: 'Sign Request',
            type: 'object',
            allOf: [
              {
                $ref: '#/definitions/SignRequestCreateRequest',
              },
              {
                properties: {
                  signers: {
                    type: 'array',
                    items: {
                      $ref: '#/definitions/SignRequestSigner',
                    },
                  },
                },
              },
            ],
            definitions: {
              SignRequestCreateRequest: {
                title: 'Create a sign request',
                type: 'object',
                required: ['signers', 'source_files', 'parent_folder'],
                properties: {
                  signers: {
                    type: 'array',
                    items: {
                      $ref: '#/definitions/SignRequestCreateSigner',
                    },
                  },
                },
              },
              SignRequestCreateSigner: {
                title: 'Signer fields for Create Sign Request',
                type: 'object',
                required: ['email'],
                properties: {
                  email: {
                    type: 'string',
                  },
                },
              },
              SignRequestSigner: {
                title: 'Signer fields for GET Sign Request response',
                type: 'object',
                required: ['email'],
                allOf: [
                  {
                    $ref: '#/definitions/SignRequestCreateSigner',
                  },
                  {
                    properties: {
                      has_viewed_document: {
                        type: 'boolean',
                      },
                    },
                  },
                ],
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
                     └─ #/properties/signers
                        ├─ types
                        │  └─ 0: array
                        ├─ primaryType: array
                        └─ children
                           └─ 0
                              └─ #/properties/signers/items
                                 ├─ types
                                 │  └─ 0: object
                                 ├─ primaryType: object
                                 └─ children
                                    ├─ 0
                                    │  └─ #/properties/signers/items/properties/email
                                    │     ├─ types
                                    │     │  └─ 0: string
                                    │     └─ primaryType: string
                                    └─ 1
                                       └─ #/properties/signers/items/properties/has_viewed_document
                                          ├─ types
                                          │  └─ 0: boolean
                                          └─ primaryType: boolean
            "
          `);
        });

        it('given allOf having a $ref pointing at another allOf, should merge it', () => {
          const schema: JSONSchema4 = {
            type: 'object',
            allOf: [
              {
                $ref: '#/definitions/Item',
              },
              {
                properties: {
                  summary: {
                    type: 'string',
                  },
                },
              },
            ],
            definitions: {
              Item: {
                allOf: [
                  {
                    properties: {
                      id: {
                        type: 'string',
                      },
                    },
                  },
                  {
                    properties: {
                      description: {
                        type: 'string',
                      },
                    },
                  },
                ],
              },
            },
          };

          const tree = new SchemaTree(schema);
          tree.populate();

          expect(printTree(schema)).toMatchInlineSnapshot(`
            "└─ #
               ├─ types
               │  └─ 0: object
               ├─ primaryType: object
               └─ children
                  ├─ 0
                  │  └─ #/properties/summary
                  │     ├─ types
                  │     │  └─ 0: string
                  │     └─ primaryType: string
                  ├─ 1
                  │  └─ #/properties/id
                  │     ├─ types
                  │     │  └─ 0: string
                  │     └─ primaryType: string
                  └─ 2
                     └─ #/properties/description
                        ├─ types
                        │  └─ 0: string
                        └─ primaryType: string
            "
          `);
        });
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

    it('given empty schema, should output empty tree', () => {
      expect(printTree({})).toEqual('');
    });

    it('should override description', () => {
      const schema = {
        type: 'object',
        properties: {
          caves: {
            type: 'array',
            items: {
              summary: 'Bear cave',
              $ref: '#/$defs/Cave',
              description: 'Apparently Tom likes bears',
            },
          },
          greatestBear: {
            $ref: '#/$defs/Bear',
            description: 'The greatest bear!',
          },
          bestBear: {
            $ref: '#/$defs/Bear',
            summary: 'The best bear!',
          },
        },
        $defs: {
          Bear: {
            type: 'string',
            summary: "Tom's favorite bear",
          },
          Cave: {
            type: 'string',
            summary: 'A cave',
            description: '_Everyone_ ~hates~ loves caves',
          },
        },
      };

      const tree = new SchemaTree(schema, {});
      tree.populate();

      expect(tree.root).toEqual(
        expect.objectContaining({
          children: [
            expect.objectContaining({
              primaryType: 'object',
              types: ['object'],
              children: [
                expect.objectContaining({
                  primaryType: 'array',
                  subpath: ['properties', 'caves'],
                  types: ['array'],
                  children: [
                    expect.objectContaining({
                      primaryType: 'string',
                      types: ['string'],
                      subpath: ['items'],
                      annotations: {
                        description: 'Apparently Tom likes bears',
                      },
                    }),
                  ],
                }),
                expect.objectContaining({
                  primaryType: 'string',
                  types: ['string'],
                  subpath: ['properties', 'greatestBear'],
                  annotations: {
                    description: 'The greatest bear!',
                  },
                }),
                expect.objectContaining({
                  primaryType: 'string',
                  types: ['string'],
                  subpath: ['properties', 'bestBear'],
                  annotations: {},
                }),
              ],
            }),
          ],
        }),
      );
    });
  });

  describe('position', () => {
    let schema: JSONSchema4;

    beforeEach(() => {
      schema = {
        type: ['string', 'object'],
        properties: {
          ids: {
            type: 'array',
            items: {
              type: 'integer',
            },
          },
          tag: {
            type: 'string',
          },
          uuid: {
            type: 'string',
          },
        },
      };
    });

    it('given node being the only child, should have correct position info', () => {
      const tree = new SchemaTree(schema);
      tree.populate();

      const node = tree.root.children[0];

      expect(node.isFirst).toBe(true);
      expect(node.isLast).toBe(true);
      expect(node.pos).toEqual(0);
    });

    it('given node being the first child among other children, should have correct position info', () => {
      const tree = new SchemaTree(schema);
      tree.populate();

      const node = (tree.root.children[0] as RegularNode).children![0];

      expect(node.isFirst).toBe(true);
      expect(node.isLast).toBe(false);
      expect(node.pos).toEqual(0);
    });

    it('given node being the last child among other children, should have correct position info', () => {
      const tree = new SchemaTree(schema);
      tree.populate();

      const node = (tree.root.children[0] as RegularNode).children![2];

      expect(node.isFirst).toBe(false);
      expect(node.isLast).toBe(true);
      expect(node.pos).toEqual(2);
    });

    it('given node not being the first nor the child among other children, should have correct position info', () => {
      const tree = new SchemaTree(schema);
      tree.populate();

      const node = (tree.root.children[0] as RegularNode).children![1];

      expect(node.isFirst).toBe(false);
      expect(node.isLast).toBe(false);
      expect(node.pos).toEqual(1);
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
