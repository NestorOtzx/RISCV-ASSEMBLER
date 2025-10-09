import { RiscVToBinary } from '../translator';
import { normalizeRegisters, normalizeImmediates } from './test-tools';

describe('RiscVToBinary J-Type Instructions', () => {
  const cases = [
    ['jal x1, -40', '11111101100111111111000011101111'],
    ['jal ra, 0x4', '00000000010000000000000011101111'],
    ['jalr x1, 0(x5)', '00000000000000101000000011100111'],
    ['jalr x1, -4(x3)', '11111111110000011000000011100111'],
    ['jalr ra, 4(t0)', '00000000010000101000000011100111']
  ];

  for (const [instruction, expected] of cases) {
    it(`encodes "${instruction}" correctly`, () => {
      const result = RiscVToBinary([instruction]);
      const output = result.output[0];

      expect(normalizeRegisters(normalizeImmediates(output))).toBe(expected);
      expect(result.errors.length).toBe(0);
    });
  }
});
