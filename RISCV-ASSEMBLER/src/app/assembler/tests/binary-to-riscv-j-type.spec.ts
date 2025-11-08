import { BinaryToRiscV } from '../translator';
import { normalizeRegisters, normalizeImmediates } from './test-tools';

describe('BinaryToRiscV J-Type Instructions', () => {
  const cases = [
    ['jal x1, -40', '11111101100111111111000011101111'],
    ['jal ra, 0x4', '00000000010000000000000011101111'],
    ['jalr x1, 0(x5)', '00000000000000101000000011100111'],
    ['jalr ra, 4(t0)', '00000000010000101000000011100111']
  ];


  for (const [expected, binary] of cases) {
    it(`decodes "${binary}" correctly`, () => {
      const result = BinaryToRiscV([binary], 8);
      const output = result.output[0];

      // Normalizamos para evitar falsos negativos por registros o inmediatos equivalentes
      expect(normalizeRegisters(normalizeImmediates(output))).toBe(
        normalizeRegisters(normalizeImmediates(expected))
      );
      expect(result.errors.length).toBe(0);
    });
  }
});
