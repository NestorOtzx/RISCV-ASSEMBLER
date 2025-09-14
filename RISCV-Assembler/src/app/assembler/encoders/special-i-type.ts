import { specialIInstructions } from '../instruction-tables';
import { registerToBinary,  encodeImmediate12Bits, parseImmediate} from '../utils';

export function assembleSpecialITypeProgressive(instruction: string): string | null {
  const tokens = instruction.trim().split(/[\s,()]+/);
  const mnemonic = tokens[0];

  if (mnemonic === 'ecall') {
    return `00000000000000000000000001110011`;
  }

  if (mnemonic === 'ebreak') {
    return `00000000000100000000000001110011`;
  }

  const instrData = specialIInstructions[mnemonic as keyof typeof specialIInstructions];
  if (!instrData) return null;

  // Narrowing explícito
  if ('funct3' in instrData) {
    const rdBin = registerToBinary(tokens[1]);
    const rs1Bin = registerToBinary(tokens[2]);
    const immVal = tokens[3] !== undefined ? parseImmediate(tokens[3]) : 0;
    const immBin = encodeImmediate12Bits(immVal);

    return `${immBin}${rs1Bin}${instrData.funct3}${rdBin}${instrData.opcode}`.slice(-32);
  }

  return null;
}

export function decodeSpecialITypeProgressive(binary: string): string | null {
  if (!binary || binary.length === 0) return null;
  const padded = binary.padStart(32, '0');
  const opcode = padded.slice(-7);

  // Casos especiales
  if (padded === '00000000000000000000000001110011') return 'ecall';
  if (padded === '00000000000100000000000001110011') return 'ebreak';

  // Buscar instrucción especial por opcode
  const entry = Object.entries(specialIInstructions).find(
    ([, data]) => data.opcode === opcode
  );

  if (!entry) return null; // Si no se encuentra coincidencia, retornar null

  const rdBin = padded.slice(20, 25);
  const rs1Bin = padded.slice(12, 17);
  const immBin = padded.slice(0, 12);

  const rd = rdBin ? `x${parseInt(rdBin, 2)}` : '';
  const rs1 = rs1Bin ? `x${parseInt(rs1Bin, 2)}` : '';
  const imm = parseInt(immBin, 2);

  return `${entry[0]} ${rd} ${rs1} ${imm}`.trim();
}