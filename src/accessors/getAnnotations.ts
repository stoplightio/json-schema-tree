import type { SchemaAnnotations } from '../nodes/types';
import type { SchemaFragment } from '../types';
import { pick } from '../utils/pick';

const ANNOTATIONS: SchemaAnnotations[] = ['description', 'default', 'examples'];

export function getAnnotations(fragment: SchemaFragment) {
  return pick(fragment, ANNOTATIONS);
}
