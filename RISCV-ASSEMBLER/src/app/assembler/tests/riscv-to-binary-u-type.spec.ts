import { RiscVToBinary } from '../translator';
import { normalizeRegisters, normalizeImmediates } from './test-tools';

describe('RiscVToBinary U-Type Instructions', () => {
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
  for (const [instruction, expected] of cases) {
    it(`encodes "${instruction}" correctly`, () => {
      const result = RiscVToBinary([instruction], 8);
      const output = result.output[0];

      expect(normalizeRegisters(normalizeImmediates(output))).toBe(expected);
      expect(result.errors.length).toBe(0);
    });
  }
});
