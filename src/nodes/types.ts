import type { MirrorNode } from './MirrorNode';
import type { ReferenceNode } from './ReferenceNode';
import type { RegularNode } from './RegularNode';
import type { RootNode } from './RootNode';

export type SchemaNode = RootNode | RegularNode | ReferenceNode | MirrorNode;

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

export type SchemaAnnotations = 'description' | 'default' | 'examples';

export type SchemaMeta = 'id' | '$schema';
