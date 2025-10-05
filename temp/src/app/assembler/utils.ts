import { 
  rInstructions, 
  iInstructions, 
  sInstructions, 
  bInstructions, 
  jInstructions, 
  uInstructions, 
  specialIInstructions 
} from './instruction-tables';

export function registerToBinary(reg: string | undefined): string {
  if (!reg || !reg.startsWith('x')) return '00000';
  const regNum = parseInt(reg.slice(1));
  if (isNaN(regNum) || regNum < 0 || regNum > 31) return '00000';
  return regNum.toString(2).padStart(5, '0');
}

export function encodeImmediate12Bits(value: number): string {
  const maskedValue = value & 0xFFF;
  return maskedValue.toString(2).padStart(12, (maskedValue & 0x800) ? '1' : '0');
}

export function parseImmediate(token: string): number {
  if (token.startsWith('0x') || token.startsWith('0X')) {
    return parseInt(token, 16);
  } else if (!isNaN(Number(token))) {
    return parseInt(token, 10);
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
  const clean = bin.replace(/[^01]/g, ''); // solo bits
  if (clean.length === 0) return false;

  // Tomamos hasta los últimos 7 bits
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