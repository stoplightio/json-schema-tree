export class ResolvingError extends ReferenceError {
  public readonly name = 'ResolvingError';
}

export class MergingError extends Error {
  public readonly name = 'MergingError';
}
