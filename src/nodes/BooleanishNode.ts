import { BaseNode } from './BaseNode';

export class BooleanishNode extends BaseNode {
  constructor(public readonly fragment: boolean) {
    super();
  }
}
