import { iInstructions } from '../instruction-tables';
import { registerToBinary,  encodeImmediate12Bits, parseImmediate} from '../utils';

export function assembleITypeProgressive(instruction: string): string | null {
  const tokens = instruction.trim().split(/[\s,()]+/);
  const mnemonic = tokens[0];
  const instrData = iInstructions[mnemonic as keyof typeof iInstructions];
  if (!instrData) return null;

  const rdBin = registerToBinary(tokens[1]);
  let rs1Bin = '00000';
  let immVal = 0;

  if (instrData.opcode === '0010011') {
    rs1Bin = registerToBinary(tokens[2]);
    if (tokens[3] !== undefined) {
      immVal = parseImmediate(tokens[3]);
    }
  }

  if (instrData.opcode === '0000011') {
    if (tokens.length >= 3) {
      immVal = parseImmediate(tokens[2]);
    }
    if (tokens.length >= 4) {
      rs1Bin = registerToBinary(tokens[3]);
    }
  }

  let immBin = '';

  if (mnemonic === 'slli' || mnemonic === 'srli' || mnemonic === 'srai') {
    const shamt = immVal & 0b11111;
    const funct7 = instrData.funct7 ?? '0000000';
    immBin = funct7 + shamt.toString(2).padStart(5, '0');
  } else {
    immBin = encodeImmediate12Bits(immVal);
  }

  return `${immBin}${rs1Bin}${instrData.funct3}${rdBin}${instrData.opcode}`.slice(-32);
}

export function decodeITypeProgressive(binary: string): string | null {
  if (!binary || binary.length === 0) return null;
  const padded = binary.padStart(32, '0');

  const opcode = padded.slice(-7);
  const rdBin = padded.slice(20, 25);
  const funct3 = padded.slice(17, 20);
  const rs1Bin = padded.slice(12, 17);
  const immBin = padded.slice(0, 12);

  // Buscar instrucción que coincida exactamente con opcode y funct3 (si existe)
  const entry = Object.entries(iInstructions).find(
    ([, data]) => data.opcode === opcode && (!data.funct3 || data.funct3 === funct3)
  );

  if (!entry) return null; // No se pudo decodificar

  const mnemonic = entry[0];
  const rd = rdBin ? `x${parseInt(rdBin, 2)}` : '';
  const rs1 = rs1Bin ? `x${parseInt(rs1Bin, 2)}` : '';
  const imm = immBin ? parseInt(immBin, 2) : 0;

  return `${mnemonic} ${rd} ${rs1} ${imm}`.trim();
}