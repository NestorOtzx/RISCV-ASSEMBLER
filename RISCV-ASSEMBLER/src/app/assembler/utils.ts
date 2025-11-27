import { 
  rInstructions, 
  iInstructions, 
  sInstructions, 
  bInstructions, 
  jInstructions, 
  uInstructions, 
  specialIInstructions 
} from './instruction-tables';

const REGISTER_ALIASES: Record<string, number> = {
  zero: 0,
  ra: 1,
  sp: 2,
  gp: 3,
  tp: 4,
  t0: 5,
  t1: 6,
  t2: 7,
  s0: 8,
  fp: 8,
  s1: 9,
  a0: 10,
  a1: 11,
  a2: 12,
  a3: 13,
  a4: 14,
  a5: 15,
  a6: 16,
  a7: 17,
  s2: 18,
  s3: 19,
  s4: 20,
  s5: 21,
  s6: 22,
  s7: 23,
  s8: 24,
  s9: 25,
  s10: 26,
  s11: 27,
  t3: 28,
  t4: 29,
  t5: 30,
  t6: 31
};


export function registerToBinary(reg: string | undefined): string {
  if (!reg) return '00000';

  const normalized = reg.trim().toLowerCase();

  if (normalized.startsWith('x')) {
    const regNum = parseInt(normalized.slice(1));
    if (!isNaN(regNum) && regNum >= 0 && regNum <= 31) {
      return regNum.toString(2).padStart(5, '0');
    }
  }

  if (normalized in REGISTER_ALIASES) {
    const regNum = REGISTER_ALIASES[normalized];
    return regNum.toString(2).padStart(5, '0');
  }

  return '00000';
}


export function encodeImmediate12Bits(value: number): string {
  const maskedValue = value & 0xFFF;
  return maskedValue.toString(2).padStart(12, (maskedValue & 0x800) ? '1' : '0');
}

export function parseImmediate(token: string): number {
  if (!token) return 0;

  token = token.trim();

  let sign = 1;

  if (token.startsWith('-')) {
    sign = -1;
    token = token.slice(1);
  } else if (token.startsWith('+')) {
    token = token.slice(1);
  }

  if (/^0x[0-9a-f]+$/i.test(token)) {
    return sign * parseInt(token, 16);
  }

  if (!isNaN(Number(token))) {
    return sign * parseInt(token, 10);
  }

  return 0;
}


export function isValidRISCVInstruction(line: string): boolean {
  if (!line) return false;

  const tokens = line.split(/[\s,()]+/);
  const mnemonic = tokens[0];

  return (
    mnemonic in rInstructions ||
    mnemonic in iInstructions ||
    mnemonic in sInstructions ||
    mnemonic in bInstructions ||
    mnemonic in jInstructions ||
    mnemonic in uInstructions ||
    mnemonic in specialIInstructions
  );
}

const allOpcodes = new Set<string>([
  ...Object.values(rInstructions).map(i => i.opcode),
  ...Object.values(iInstructions).map(i => i.opcode),
  ...Object.values(sInstructions).map(i => i.opcode),
  ...Object.values(bInstructions).map(i => i.opcode),
  ...Object.values(jInstructions).map(i => i.opcode),
  ...Object.values(uInstructions).map(i => i.opcode),
  ...Object.values(specialIInstructions).map(i => i.opcode)
]);

export function isValidBinaryInstruction(bin: string): boolean {
  if (!bin) return false;
  const clean = bin.replace(/[^01]/g, ''); 
  if (clean.length === 0) return false;

  const candidate = clean.slice(-7).padStart(7, '0');
  return allOpcodes.has(candidate);
}

export function isValidHexInstruction(hex: string): boolean {
  if (!hex) return false;
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  if (clean.length === 0) return false;

  const bin = parseInt(clean, 16).toString(2);
  const candidate = bin.slice(-7).padStart(7, '0');
  return allOpcodes.has(candidate);
}