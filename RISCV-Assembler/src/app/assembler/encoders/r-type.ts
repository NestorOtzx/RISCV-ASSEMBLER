import { rInstructions } from '../instruction-tables';
import { registerToBinary,  encodeImmediate12Bits, parseImmediate} from '../utils';

export function assembleRTypeProgressive(instruction: string): string | null {
  const tokens = instruction.trim().split(/[\s,]+/);
  const mnemonic = tokens[0];
  const instrData = rInstructions[mnemonic as keyof typeof rInstructions];
  if (!instrData) return null;

  const rdBin = registerToBinary(tokens[1]);
  const rs1Bin = registerToBinary(tokens[2]);
  const rs2Bin = registerToBinary(tokens[3]);

  return `${instrData.funct7}${rs2Bin}${rs1Bin}${instrData.funct3}${rdBin}${instrData.opcode}`;
}