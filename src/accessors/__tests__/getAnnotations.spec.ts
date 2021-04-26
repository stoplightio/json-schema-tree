import { getAnnotations } from '../getAnnotations';

describe('getAnnotations util', () => {
  it('should treat example as examples', () => {
    expect(
      getAnnotations({
        example: 'foo',
      }),
    ).toStrictEqual({
      examples: ['foo'],
    });
  });

  it('should prefer examples over example', () => {
    expect(
      getAnnotations({
        examples: ['bar', 'baz'],
        example: 'foo',
      }),
    ).toStrictEqual({
      examples: ['bar', 'baz'],
    });
  });
});
