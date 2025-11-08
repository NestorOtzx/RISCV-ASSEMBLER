import { RiscVToBinary } from '../translator';

describe('RiscVToBinary B-Type Instructions', () => {
  const cases = [
    ['beq x5, x6, 0x4', '00000000011000101000001001100011'],
    ['beq t0, t1, 20', '00000000011000101000101001100011'],
    ['bne x5, x6, 0x4', '00000000011000101001001001100011'],
    ['bne x8, x9, 0x1ffe', '11111110100101000001111111100011'],
    ['blt x5, x6, 0x4', '00000000011000101100001001100011'],
    ['blt a0, a1, -4', '11111110101101010100111011100011'],
    ['bge x5, x6, 8', '00000000011000101101010001100011'],
    ['bge t0, t1, 0x4', '00000000011000101101001001100011'],
    ['bltu x5, x6, -20', '11111110011000101110011011100011'],
    ['bltu s0, s1, 0x4', '00000000100101000110001001100011'],
    ['bgeu x5, x6, 4', '00000000011000101111001001100011'],
    ['bgeu a0, a1, 4', '00000000101101010111001001100011']
  ];

  for (const [instruction, expected] of cases) {
    it(`encodes "${instruction}" correctly`, () => {
      const result = RiscVToBinary([instruction], 8);
      expect(result.output[0]).toBe(expected);
      expect(result.errors.length).toBe(0);
    });
  }
});
