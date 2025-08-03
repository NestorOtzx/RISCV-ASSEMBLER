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
