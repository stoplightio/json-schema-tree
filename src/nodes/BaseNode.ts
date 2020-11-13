import type { SchemaFragment } from '../types';
import type { MirrorNode } from './MirrorNode';
import type { RegularNode } from './RegularNode';
import type { RootNode } from './RootNode';

let SEED = 0;

export abstract class BaseNode {
  public readonly id: string;

  public parent: RegularNode | RootNode | MirrorNode | null = null;
  public subpath: string[];

  public get path(): ReadonlyArray<string> {
    return this.parent === null ? this.subpath : [...this.parent.path, ...this.subpath];
  }

  protected constructor(public readonly fragment: SchemaFragment) {
    this.id = String(SEED++);
    this.subpath = [];
  }
}
