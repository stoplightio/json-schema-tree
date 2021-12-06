import type { SchemaFragment } from '../types';
import type { MirroredRegularNode } from './mirrored';
import type { RegularNode } from './RegularNode';
import type { RootNode } from './RootNode';

let SEED = BigInt(0); // cannot use literal, cause TS.

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

  private get parentChildren(): BaseNode[] {
    return (this.parent?.children ?? []) as BaseNode[];
  }

  public get pos(): number {
    return Math.max(0, this.parentChildren.indexOf(this));
  }

  public get isFirst(): boolean {
    return this.pos === 0;
  }

  public get isLast(): boolean {
    return this.pos === this.parentChildren.length - 1;
  }

  protected constructor(public readonly fragment: SchemaFragment) {
    this.id = String(SEED++);
    this.subpath = [];
  }
}
