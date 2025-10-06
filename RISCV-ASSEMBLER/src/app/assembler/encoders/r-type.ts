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

export function decodeRTypeProgressive(binary: string): string | null {
  if (!binary || binary.length === 0) return null;

  const padded = binary.padStart(32, '0');
  const opcode = padded.slice(-7);
  const funct3 = padded.slice(17, 20);
  const funct7 = padded.slice(0, 7);
  const rdBin = padded.slice(20, 25);
  const rs1Bin = padded.slice(12, 17);
  const rs2Bin = padded.slice(7, 12);

  // Buscar instrucción que coincida exactamente con opcode, funct3 y funct7
  const entry = Object.entries(rInstructions).find(
    ([, data]) =>
      data.opcode === opcode &&
      (!data.funct3 || data.funct3 === funct3) &&
      (!data.funct7 || data.funct7 === funct7)
  );

  if (!entry) return null; // Si no se encuentra coincidencia exacta, retornar null

  const mnemonic = entry[0];
  const rd = rdBin ? `x${parseInt(rdBin, 2)}` : '';
  const rs1 = rs1Bin ? `x${parseInt(rs1Bin, 2)}` : '';
  const rs2 = rs2Bin ? `x${parseInt(rs2Bin, 2)}` : '';

  return `${mnemonic} ${rd}, ${rs1}, ${rs2}`.trim();
}


