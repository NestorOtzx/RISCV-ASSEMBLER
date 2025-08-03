import { jInstructions } from '../instruction-tables';
import { registerToBinary,  encodeImmediate12Bits, parseImmediate} from '../utils';

export function assembleJTypeProgressive(instruction: string): string | null {
  const tokens = instruction.trim().split(/[\s,()]+/);
  const mnemonic = tokens[0];
  if (mnemonic !== 'jal') return null;

  const rdBin = registerToBinary(tokens[1]);
  const immVal = tokens[2] !== undefined ? parseImmediate(tokens[2]) : 0;

  // imm[20|10:1|11|19:12]
  const imm = (immVal >> 1) & 0xFFFFF;  // Offsets multiples of 2
  const immBin = imm.toString(2).padStart(20, (imm & 0x80000) ? '1' : '0');

  const imm20   = immBin[0] || '0';
  const imm10_1 = immBin.slice(10).padEnd(10, '0');
  const imm11   = immBin[9] || '0';
  const imm19_12 = immBin.slice(1, 9).padEnd(8, '0');

  return `${imm20}${imm19_12}${imm11}${imm10_1}${rdBin}1101111`.slice(-32);
}