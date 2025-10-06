import { RiscVToBinary } from '../translator';

describe('RiscVToBinary S-Type Instructions', () => {
  const cases = [
    ['sw x5, 0(x6)', '00000000010100110010000000100011'],
    ['sw t0, 4(t1)', '00000000010100110010001000100011'],
    ['sb x5, 0(x6)', '00000000010100110000000000100011'],
    ['sb s0, 8(s1)', '00000000100001001000010000100011'],
    ['sh x5, 0(x6)', '00000000010100110001000000100011'],
    ['sh a0, 12(a1)', '00000000101001011001011000100011']
  ];

  for (const [instruction, expected] of cases) {
    it(`encodes "${instruction}" correctly`, () => {
      const result = RiscVToBinary([instruction]);
      expect(result.output[0]).toBe(expected);
      expect(result.errors.length).toBe(0);
    });
  }
});
