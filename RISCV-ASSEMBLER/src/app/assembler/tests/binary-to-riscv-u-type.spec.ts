import { BinaryToRiscV } from '../translator';
import { normalizeRegisters, normalizeImmediates } from './test-tools';

describe('BinaryToRiscV U-Type Instructions', () => {
  const cases = [
    ['lui x5, 0x12345', '00010010001101000101001010110111'],
    ['lui t0, 0xFEDC',  '00001111111011011100001010110111'],
    ['lui x5, 0x12345', '00010010001101000101001010110111'],
    ['lui t0, 0x6789',  '00000110011110001001001010110111'],
    ['auipc x5, 0x2345', '00000010001101000101001010010111'],
    ['auipc s0, 0xABCD', '00001010101111001101010000010111'],
    ['auipc x5, 0x12345','00010010001101000101001010010111'],
    ['auipc s0, 0xCBA9', '00001100101110101001010000010111']
  ];
  for (const [expected, binary] of cases) {
    it(`decodes "${binary}" correctly`, () => {
      const result = BinaryToRiscV([binary], 8);
      const output = normalizeRegisters(normalizeImmediates(result.output[0]));

      expect(output).toBe(normalizeRegisters(normalizeImmediates(expected)));
      expect(result.errors.length).toBe(0);
    });
  }
});
