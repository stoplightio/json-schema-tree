import type { MirroredReferenceNode } from './mirrored/MirroredReferenceNode';
import type { MirroredRegularNode } from './mirrored/MirroredRegularNode';
import type { ReferenceNode } from './ReferenceNode';
import type { RegularNode } from './RegularNode';
import type { RootNode } from './RootNode';

export type MirroredSchemaNode = MirroredRegularNode | MirroredReferenceNode;

export type SchemaNode = RootNode | RegularNode | ReferenceNode | MirroredSchemaNode;

export enum SchemaNodeKind {
  Any = 'any',
  String = 'string',
  Number = 'number',
  Integer = 'integer',
  Boolean = 'boolean',
  Null = 'null',
  Array = 'array',
  Object = 'object',
}

export enum SchemaCombinerName {
  AllOf = 'allOf',
  AnyOf = 'anyOf',
  OneOf = 'oneOf',
}

export type SchemaAnnotations = 'description' | 'default' | 'examples' | 'const' | 'example' | 'x-example';

export type SchemaMeta = 'id' | '$schema';
