import * as fs from 'fs';
import * as path from 'path';

import { SchemaTree } from '../tree';

describe('SchemaTree', () => {
  describe('recursive walking', () => {
    it('should load quickly', async () => {
      const schema = JSON.parse(
        await fs.promises.readFile(path.resolve(__dirname, '__fixtures__', 'recursive-schema.json'), 'utf8'),
      );

      const w = new SchemaTree(schema);
      w.populate();
    });
  });
});
