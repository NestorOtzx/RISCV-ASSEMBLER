import { BinaryToRiscV } from '../translator';
import { normalizeRegisters } from './test-tools'; // si ya la creaste antes

describe('BinaryToRiscV S-Type Instructions', () => {
  const cases = [
    ['sw x5, 0(x6)', '00000000010100110010000000100011'],
    ['sw t0, 4(t1)', '00000000010100110010001000100011'],
    ['sb x5, 0(x6)', '00000000010100110000000000100011'],
    ['sb s0, 8(s1)', '00000000100001001000010000100011'],
    ['sh x5, 0(x6)', '00000000010100110001000000100011'],
    ['sh a0, 12(a1)', '00000000101001011001011000100011']
  ];

  for (const [expectedInstruction, binary] of cases) {
    it(`decodes "${binary}" correctly`, () => {
      const result = BinaryToRiscV([binary], 8);
      const normalizedExpected = normalizeRegisters(expectedInstruction);
      const normalizedResult = normalizeRegisters(result.output[0]);

      expect(normalizedResult).toBe(normalizedExpected);
      expect(result.errors.length).toBe(0);
    });
  }
});
