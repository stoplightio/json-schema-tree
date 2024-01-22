import type { SchemaFragment } from '../types';
import { BaseNode } from './BaseNode';
import type { SchemaNode } from './types';

export class RootNode extends BaseNode {
  public readonly parent = null;
  public readonly children: SchemaNode[];

  constructor(public readonly fragment: SchemaFragment) {
    super();
    this.children = [];
  }
}
