import { uInstructions } from '../instruction-tables';
import { registerToBinary,  encodeImmediate12Bits, parseImmediate} from '../utils';

export function assembleUTypeProgressive(instruction: string): string | null {
  const tokens = instruction.trim().split(/[\s,()]+/);
  const mnemonic = tokens[0];
  const instrData = uInstructions[mnemonic as keyof typeof uInstructions];
  if (!instrData) return null;

  const rdBin = registerToBinary(tokens[1]);
  const immVal = tokens[2] !== undefined ? parseImmediate(tokens[2]) : 0;
  const immBin = (immVal >>> 12).toString(2).padStart(20, '0');

  return `${immBin}${rdBin}${instrData.opcode}`.slice(-32);
}