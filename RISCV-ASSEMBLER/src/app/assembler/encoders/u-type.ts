import { uInstructions } from '../instruction-tables';
import { registerToBinary,  encodeImmediate12Bits, parseImmediate} from '../utils';

export function assembleUTypeProgressive(instruction: string): string | null {
  const tokens = instruction.trim().split(/[\s,()]+/);
  const mnemonic = tokens[0];
  const instrData = uInstructions[mnemonic as keyof typeof uInstructions];
  if (!instrData) return null;

  const rdBin = registerToBinary(tokens[1]);
  const immVal = tokens[2] !== undefined ? parseImmediate(tokens[2]) : 0;
  const immBin = (immVal).toString(2).padStart(20, '0');

  return `${immBin}${rdBin}${instrData.opcode}`.slice(-32);
}


export function decodeUTypeProgressive(binary: string): string | null {
  if (!binary || binary.length === 0) return null;
  const padded = binary.padStart(32, '0');

  const opcode = padded.slice(-7);
  const rdBin = padded.slice(20, 25);
  const immBin = padded.slice(0, 20);

  const entry = Object.entries(uInstructions).find(
    ([, data]) => data.opcode === opcode
  );

  if (!entry) return null; 

  const mnemonic = entry[0];
  const rd = rdBin ? `x${parseInt(rdBin, 2)}` : '';
  const imm = parseInt(immBin, 2);

  return `${mnemonic} ${rd}, ${imm}`.trim();
}
