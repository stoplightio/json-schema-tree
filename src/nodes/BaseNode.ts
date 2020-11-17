import type { SchemaFragment } from '../types';
import type { MirroredRegularNode } from './mirrored';
import type { RegularNode } from './RegularNode';
import type { RootNode } from './RootNode';

let SEED = 0;

export abstract class BaseNode {
  public readonly id: string;

  public parent: RegularNode | RootNode | MirroredRegularNode | null = null;
  public subpath: string[];

  public get path(): ReadonlyArray<string> {
    return this.parent === null ? this.subpath : [...this.parent.path, ...this.subpath];
  }

  public get depth(): number {
    return this.parent === null ? 0 : this.parent.depth + 1;
  }

  protected constructor(public readonly fragment: SchemaFragment) {
    this.id = String(SEED++);
    this.subpath = [];
  }
}
