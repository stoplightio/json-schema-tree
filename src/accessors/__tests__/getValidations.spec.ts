import { SchemaNodeKind } from '../../nodes/types';
import { getValidations } from '../getValidations';

describe('getValidations util', () => {
  it('should support integer type', () => {
    expect(
      getValidations(
        {
          minimum: 2,
          exclusiveMaximum: true,
          maximum: 20,
          multipleOf: 2,
        },
        [SchemaNodeKind.Integer],
      ),
    ).toStrictEqual({
      exclusiveMaximum: true,
      maximum: 20,
      minimum: 2,
      multipleOf: 2,
    });
  });
});
