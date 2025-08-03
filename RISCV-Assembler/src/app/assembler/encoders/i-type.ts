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