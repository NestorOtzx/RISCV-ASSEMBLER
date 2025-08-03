import { bInstructions } from '../instruction-tables';
import { registerToBinary,  encodeImmediate12Bits, parseImmediate} from '../utils';

export function assembleBTypeProgressive(instruction: string): string | null {
  const tokens = instruction.trim().split(/[\s,()]+/);
  const mnemonic = tokens[0];
  const instrData = bInstructions[mnemonic as keyof typeof bInstructions];
  if (!instrData) return null;

  const rs1Bin = registerToBinary(tokens[1]);
  const rs2Bin = registerToBinary(tokens[2]);
  const immVal = tokens[3] !== undefined ? parseImmediate(tokens[3]) : 0;

  const imm = (immVal >> 1) & 0xFFF;  // Offsets are multiples of 2
  const immBin = imm.toString(2).padStart(12, (imm & 0x800) ? '1' : '0'); // Sign extension

  const imm12   = immBin[0] || '0';
  const imm10_5 = immBin.slice(1, 7).padEnd(6, '0');
  const imm4_1  = immBin.slice(7, 11).padEnd(4, '0');
  const imm11   = immBin[11] || '0';

  return `${imm12}${imm10_5}${rs2Bin}${rs1Bin}${instrData.funct3}${imm4_1}${imm11}${instrData.opcode}`.slice(-32);
}