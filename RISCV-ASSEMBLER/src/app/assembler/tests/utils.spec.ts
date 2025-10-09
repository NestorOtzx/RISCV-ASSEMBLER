import {
  registerToBinary,
  encodeImmediate12Bits,
  parseImmediate,
  isValidRISCVInstruction,
  isValidBinaryInstruction,
  isValidHexInstruction
} from '../utils';

import {
  rInstructions,
  iInstructions,
  sInstructions,
  bInstructions,
  jInstructions,
  uInstructions,
  specialIInstructions
} from '../instruction-tables';

describe('Utils', () => {

  describe('registerToBinary', () => {
    it('should return 00000 if undefined', () => {
      expect(registerToBinary(undefined)).toBe('00000');
    });

    it('should convert xN format correctly', () => {
      expect(registerToBinary('x0')).toBe('00000');
      expect(registerToBinary('x31')).toBe('11111');
    });

    it('should handle lowercase and uppercase properly', () => {
      expect(registerToBinary(' X10 ')).toBe('01010');
    });

    it('should convert aliases correctly', () => {
      expect(registerToBinary('t0')).toBe('00101');
      expect(registerToBinary('RA')).toBe('00001');
      expect(registerToBinary('fp')).toBe('01000'); // alias de s0
    });

    it('should return 00000 for invalid register', () => {
      expect(registerToBinary('x999')).toBe('00000');
      expect(registerToBinary('foo')).toBe('00000');
    });
  });

  describe('encodeImmediate12Bits', () => {
    it('should encode positive values correctly', () => {
      expect(encodeImmediate12Bits(0x123)).toBe('000100100011');
    });

    it('should encode negative numbers correctly', () => {
      // -1 → 0xFFF (12 bits)
      expect(encodeImmediate12Bits(-1)).toBe('111111111111');
    });

    it('should mask to 12 bits', () => {
      expect(encodeImmediate12Bits(0x1FFF)).toBe('111111111111');
    });
  });

  describe('parseImmediate', () => {
    it('should parse hexadecimal numbers', () => {
      expect(parseImmediate('0x10')).toBe(16);
      expect(parseImmediate('0XFF')).toBe(255);
    });

    it('should parse decimal numbers', () => {
      expect(parseImmediate('123')).toBe(123);
      expect(parseImmediate('-5')).toBe(-5);
    });

    it('should return 0 for invalid tokens', () => {
      expect(parseImmediate('foo')).toBe(0);
      expect(parseImmediate('')).toBe(0);
    });
  });

  describe('isValidRISCVInstruction', () => {
    it('should return false for empty input', () => {
      expect(isValidRISCVInstruction('')).toBeFalse();
    });

    it('should return true for a valid instruction mnemonic', () => {
      const validMnemonic = Object.keys(rInstructions)[0];
      expect(isValidRISCVInstruction(validMnemonic + ' x1, x2, x3')).toBeTrue();
    });

    it('should return false for an unknown mnemonic', () => {
      expect(isValidRISCVInstruction('unknown x1, x2')).toBeFalse();
    });
  });

  describe('isValidBinaryInstruction', () => {
    it('should return false for empty or invalid binary', () => {
      expect(isValidBinaryInstruction('')).toBeFalse();
      expect(isValidBinaryInstruction('abc')).toBeFalse();
    });

    it('should return true if last 7 bits match a known opcode', () => {
      const opcode = Object.values(rInstructions)[0].opcode;
      const validBinary = '0000000000000000000000000' + opcode;
      expect(isValidBinaryInstruction(validBinary)).toBeTrue();
    });

    it('should return false if opcode does not match', () => {
      expect(isValidBinaryInstruction('00000000000000000000000000000000')).toBeFalse();
    });
  });

  describe('isValidHexInstruction', () => {
    it('should return false for empty or invalid hex', () => {
      expect(isValidHexInstruction('')).toBeFalse();
      expect(isValidHexInstruction('xyz')).toBeFalse();
    });

    it('should return true if hex contains a known opcode', () => {
      const opcode = Object.values(iInstructions)[0].opcode;
      // Genera un número con esos 7 bits al final
      const num = parseInt(opcode, 2);
      const hex = num.toString(16);
      expect(isValidHexInstruction(hex)).toBeTrue();
    });

    it('should return false if hex does not match known opcode', () => {
      expect(isValidHexInstruction('00000000')).toBeFalse();
    });
  });
});
