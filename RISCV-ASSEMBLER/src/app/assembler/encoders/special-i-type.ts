import { specialIInstructions } from '../instruction-tables';
import { registerToBinary, encodeImmediate12Bits, parseImmediate } from '../utils';

export function assembleSpecialITypeProgressive(instruction: string): string | null {
  const tokens = instruction.trim().split(/[\s,()]+/);
  const mnemonic = tokens[0];
  const instrData = specialIInstructions[mnemonic as keyof typeof specialIInstructions];
  if (!instrData) return null;

  const rdBin = registerToBinary(tokens[1]);
  let immVal = 0;
  let rs1Bin = '';

  if (tokens.length >= 4) {
    immVal = parseImmediate(tokens[2]);
    rs1Bin = registerToBinary(tokens[3]);
  } else if (tokens.length === 3 && tokens[2].includes('(')) {
    const match = tokens[2].match(/(-?\d+|0x[0-9a-fA-F]+)\((x\d+)\)/);
    if (match) {
      immVal = parseImmediate(match[1]);
      rs1Bin = registerToBinary(match[2]);
    }
  } else if (tokens.length === 3) {
    rs1Bin = registerToBinary(tokens[2]);
  }

  const immBin = encodeImmediate12Bits(immVal);
  return `${immBin}${rs1Bin}${instrData.funct3}${rdBin}${instrData.opcode}`.slice(-32);
}

export function decodeSpecialITypeProgressive(binary: string): string | null {
  if (!binary || binary.length === 0) return null;
  const padded = binary.padStart(32, '0');
  const opcode = padded.slice(-7);

  const funct3 = padded.slice(17, 20);
  const entry = Object.entries(specialIInstructions).find(
    ([, data]) => data.opcode === opcode && data.funct3 === funct3
  );

  if (!entry) return null;

  const rdBin = padded.slice(20, 25);
  const rs1Bin = padded.slice(12, 17);
  const immBin = padded.slice(0, 12);

  let imm = parseInt(immBin, 2);
  if (immBin[0] === '1') imm -= 1 << 12;

  const rd = `x${parseInt(rdBin, 2)}`;
  const rs1 = `x${parseInt(rs1Bin, 2)}`;

  return `${entry[0]} ${rd}, ${imm}(${rs1})`;
}
