import type { Dictionary } from '@stoplight/types';

import { getAnnotations } from '../accessors/getAnnotations';
import { getCombiners } from '../accessors/getCombiners';
import { getMeta } from '../accessors/getMeta';
import { getPrimaryType } from '../accessors/getPrimaryType';
import { getRequired } from '../accessors/getRequired';
import { getTypes } from '../accessors/getTypes';
import { getValidations } from '../accessors/getValidations';
import { isDeprecated } from '../accessors/isDeprecated';
import { unwrapArrayOrNull, unwrapStringOrNull } from '../accessors/unwrap';
import { isRegularNode, isSchemaNode } from '../guards';
import type { SchemaFragment } from '../types';
import { BaseNode } from './BaseNode';
import type { ReferenceNode } from './ReferenceNode';
import { MirroredSchemaNode, SchemaAnnotations, SchemaCombinerName, SchemaMeta, SchemaNodeKind } from './types';

export class RegularNode extends BaseNode {
  public readonly types: SchemaNodeKind[] | null;
  public readonly primaryType: SchemaNodeKind | null; // object (first choice) or array (second option), primitive last
  public readonly combiners: SchemaCombinerName[] | null;

  public readonly required: string[] | null;
  public readonly enum: unknown[] | null; // https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.5.1
  public readonly format: string | null; // https://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-7
  public readonly title: string | null;
  public readonly deprecated: boolean;

  public children: (RegularNode | ReferenceNode | MirroredSchemaNode)[] | null | undefined;

  public readonly meta: Readonly<Partial<Dictionary<unknown, SchemaMeta>>>;
  public readonly annotations: Readonly<Partial<Dictionary<unknown, SchemaAnnotations>>>;
  public readonly validations: Readonly<Dictionary<unknown>>;
  public readonly context: Readonly<{ originalRef?: string }>;

  constructor(public readonly fragment: SchemaFragment, context?: { originalRef?: string }) {
    super(fragment);

    this.types = getTypes(fragment);
    this.primaryType = getPrimaryType(fragment, this.types);
    this.combiners = getCombiners(fragment);

    this.deprecated = isDeprecated(fragment);
    this.enum = unwrapArrayOrNull(fragment.enum);
    this.required = getRequired(fragment.required);
    this.format = unwrapStringOrNull(fragment.format);
    this.title = unwrapStringOrNull(fragment.title);

    this.meta = getMeta(fragment);
    this.annotations = getAnnotations(fragment);
    this.validations = getValidations(fragment, this.types);
    this.context = context ?? {};

    this.children = void 0;
  }

  public get simple() {
    return (
      this.primaryType !== SchemaNodeKind.Array && this.primaryType !== SchemaNodeKind.Object && this.combiners === null
    );
  }

  public get unknown() {
    return (
      this.types === null &&
      this.combiners === null &&
      this.format === null &&
      this.enum === null &&
      Object.keys(this.annotations).length + Object.keys(this.validations).length === 0
    );
  }

  static [Symbol.hasInstance](instance: unknown) {
    return isSchemaNode(instance) && isRegularNode(instance);
  }
}
