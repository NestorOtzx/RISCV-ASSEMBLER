import { sInstructions } from '../instruction-tables';
import { registerToBinary,  encodeImmediate12Bits, parseImmediate} from '../utils';

export function assembleSTypeProgressive(instruction: string): string | null {
  const tokens = instruction.trim().split(/[\s,()]+/);  
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

  const immBin = encodeImmediate12Bits(immVal);
  const immHigh = immBin.substring(0, 7);
  const immLow = immBin.substring(7);

  return `${immHigh}${rs2Bin}${rs1Bin}${instrData.funct3}${immLow}${instrData.opcode}`.slice(-32);
}

export function decodeSTypeProgressive(binary: string): string | null {
  if (!binary || binary.length === 0) return null;
  const padded = binary.padStart(32, '0');

  const opcode = padded.slice(-7);
  const funct3 = padded.slice(17, 20);
  const rs1Bin = padded.slice(12, 17);
  const rs2Bin = padded.slice(7, 12);
  const immHigh = padded.slice(0, 7);
  const immLow = padded.slice(20, 25);

  const immBin = immHigh + immLow;
  const imm = parseInt(immBin, 2);

  const entry = Object.entries(sInstructions).find(
    ([, data]) => data.opcode === opcode && data.funct3 === funct3
  );

  if (!entry) return null; 

  const mnemonic = entry[0];
  const rs1 = rs1Bin ? `x${parseInt(rs1Bin, 2)}` : '';
  const rs2 = rs2Bin ? `x${parseInt(rs2Bin, 2)}` : '';

  return `${mnemonic} ${rs2}, ${imm}(${rs1})`.trim();
}

