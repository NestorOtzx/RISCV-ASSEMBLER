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

function getAllOpcodes(): Set<string> {
  const all = [
    ...Object.values(rInstructions),
    ...Object.values(iInstructions),
    ...Object.values(sInstructions),
    ...Object.values(bInstructions),
    ...Object.values(jInstructions),
    ...Object.values(uInstructions),
    ...Object.values(specialIInstructions),
  ];
  return new Set(all.map(inst => inst.opcode));
}

const validOpcodes = getAllOpcodes();

export function isValidBinaryInstruction(line: string): boolean {
  if (!line) return false;
  const clean = line.trim().replace(/\s+/g, '');
  if (!/^[01]+$/.test(clean)) return false; // debe ser solo 0/1
  const opcode = clean.slice(-7); // últimos 7 bits
  return validOpcodes.has(opcode);
}

export function isValidHexInstruction(line: string): boolean {
  if (!line) return false;
  const clean = line.trim().toLowerCase();
  if (!/^0x[0-9a-f]+$/.test(clean)) return false;
  const binary = parseInt(clean, 16).toString(2);
  const opcode = binary.slice(-7).padStart(7, '0'); // últimos 7 bits
  return validOpcodes.has(opcode);
}
