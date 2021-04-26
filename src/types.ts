import type { JSONSchema4, JSONSchema6, JSONSchema7 } from 'json-schema';

export type ViewMode = 'read' | 'write' | 'standalone';

export type SchemaFragment = Record<string, unknown> | JSONSchema4 | JSONSchema6 | JSONSchema7;
