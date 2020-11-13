import type { Dictionary } from '@stoplight/types';
import type { JSONSchema4 } from 'json-schema';

export type ViewMode = 'read' | 'write' | 'standalone';

export type SchemaFragment = Dictionary<unknown, keyof JSONSchema4>;
