import type { SchemaFragment } from '../types';
import { pick } from '../utils/pick';

const ANNOTATIONS = ['description', 'default', 'examples', 'nullable'] as const;

export type SchemaAnnotations = typeof ANNOTATIONS[number];

export function getAnnotations(fragment: SchemaFragment) {
  const annotations = pick(fragment, ANNOTATIONS);
  if ('example' in fragment && !Array.isArray(annotations.examples)) {
    // example is more OAS-ish, but it's common enough to be worth supporting
    annotations.examples = [fragment.example];
  }

  return annotations;
}
