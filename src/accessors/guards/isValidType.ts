import { SchemaNodeKind } from '../../nodes/types';

const VALID_TYPES = Object.values(SchemaNodeKind);

export const isValidType = (maybeType: unknown): maybeType is SchemaNodeKind =>
  typeof maybeType === 'string' && VALID_TYPES.includes(maybeType as SchemaNodeKind);
