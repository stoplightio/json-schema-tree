import type { Dictionary } from '@stoplight/types';

import type { SchemaMeta } from '../nodes/types';
import type { SchemaFragment } from '../types';
import { pick } from '../utils';

const METADATA: SchemaMeta[] = ['id', '$schema'];

export function getMeta(fragment: SchemaFragment): Partial<Dictionary<unknown, SchemaMeta>> {
  return pick(fragment, METADATA);
}
