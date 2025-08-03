import { sInstructions } from '../instruction-tables';
import { registerToBinary,  encodeImmediate12Bits, parseImmediate} from '../utils';

export function assembleSTypeProgressive(instruction: string): string | null {
  const tokens = instruction.trim().split(/[\s,()]+/);  // Soporta formato sw x2, 0(x1)
  const mnemonic = tokens[0];
  const instrData = sInstructions[mnemonic as keyof typeof sInstructions];
  if (!instrData) return null;

  const rs2Bin = registerToBinary(tokens[1]);
  let immVal = 0;
  let rs1Bin = '00000';

  if (tokens.length >= 3) {
    immVal = parseImmediate(tokens[2]);
  }
  if (tokens.length >= 4) {
    rs1Bin = registerToBinary(tokens[3]);
  }

  // Dividir el inmediato en dos partes: imm[11:5] y imm[4:0]
  const immBin = encodeImmediate12Bits(immVal);
  const immHigh = immBin.substring(0, 7);
  const immLow = immBin.substring(7);

  return `${immHigh}${rs2Bin}${rs1Bin}${instrData.funct3}${immLow}${instrData.opcode}`.slice(-32);
}