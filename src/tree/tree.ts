import { extractPointerFromRef, extractSourceFromRef, resolveInlineRef } from '@stoplight/json';

import { ResolvingError } from '../errors';
import { RootNode } from '../nodes/RootNode';
import type { SchemaFragment } from '../types';
import { isObjectLiteral } from '../utils';
import { Walker } from '../walker';
import type { WalkerRefResolver } from '../walker/types';
import type { SchemaTreeOptions } from './types';

export class SchemaTree {
  public walker: Walker;
  public root: RootNode;
  private readonly resolvedRefs = new Map();

  constructor(public schema: SchemaFragment, protected readonly opts?: Partial<SchemaTreeOptions>) {
    this.root = new RootNode(schema);
    this.resolvedRefs = new Map();
    this.walker = new Walker(this.root, {
      mergeAllOf: this.opts?.mergeAllOf !== false,
      resolveRef: opts?.refResolver === null ? null : this.resolveRef,
      maxRefDepth: opts?.maxRefDepth,
    });
  }

  public destroy() {
    this.root.children.length = 0;
    this.walker.destroy();
    this.resolvedRefs.clear();
  }

  public populate() {
    this.invokeWalker(this.walker);
  }

  public invokeWalker(walker: Walker) {
    walker.walk();
  }

  protected resolveRef: WalkerRefResolver = (path, $ref) => {
    if (this.resolvedRefs.has($ref)) {
      return this.resolvedRefs.get($ref);
    }

    const seenRefs: string[] = [];
    let cur$ref: unknown = $ref;
    let resolvedValue!: SchemaFragment;

    while (typeof cur$ref === 'string') {
      if (seenRefs.includes(cur$ref)) {
        break;
      }

      seenRefs.push(cur$ref);
      resolvedValue = this._resolveRef(path, cur$ref);
      cur$ref = resolvedValue.$ref;
    }

    this.resolvedRefs.set($ref, resolvedValue);
    return resolvedValue;
  };

  private _resolveRef: WalkerRefResolver = (path, $ref) => {
    const source = extractSourceFromRef($ref);
    const pointer = extractPointerFromRef($ref);
    const refResolver = this.opts?.refResolver;

    if (typeof refResolver === 'function') {
      return refResolver({ source, pointer }, path, this.schema);
    } else if (source !== null) {
      throw new ResolvingError('Cannot dereference external references');
    } else if (pointer === null) {
      throw new ResolvingError('The pointer is empty');
    } else if (isObjectLiteral(this.schema)) {
      const value = resolveInlineRef(this.schema, pointer);
      if (!isObjectLiteral(value)) {
        throw new ResolvingError('Invalid value');
      }

      return value;
    } else {
      throw new ResolvingError('Unexpected input');
    }
  };
}
