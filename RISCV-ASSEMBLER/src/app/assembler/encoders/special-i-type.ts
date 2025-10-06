import { specialIInstructions } from '../instruction-tables';
import { registerToBinary, encodeImmediate12Bits, parseImmediate } from '../utils';

/**
 * Ensambla una instrucción de tipo I especial (actualmente solo jalr).
 * <para></para>
 * Convierte la instrucción RISC-V a su representación binaria de 32 bits.
 */
export function assembleSpecialITypeProgressive(instruction: string): string | null {
  const tokens = instruction.trim().split(/[\s,()]+/);
  const mnemonic = tokens[0];
  const instrData = specialIInstructions[mnemonic as keyof typeof specialIInstructions];
  if (!instrData) return null;

  // Soporta formato jalr rd, imm(rs1)
  // Ejemplo: jalr x1, 4(x5)
  const rdBin = registerToBinary(tokens[1]);
  let immVal = 0;
  let rs1Bin = '';

  if (tokens.length >= 4) {
    // caso jalr rd, imm, rs1
    immVal = parseImmediate(tokens[2]);
    rs1Bin = registerToBinary(tokens[3]);
  } else if (tokens.length === 3 && tokens[2].includes('(')) {
    // caso jalr rd, imm(rs1)
    const match = tokens[2].match(/(-?\d+|0x[0-9a-fA-F]+)\((x\d+)\)/);
    if (match) {
      immVal = parseImmediate(match[1]);
      rs1Bin = registerToBinary(match[2]);
    }
  } else if (tokens.length === 3) {
    // caso jalr rd, rs1 (sin inmediato explícito)
    rs1Bin = registerToBinary(tokens[2]);
  }

  const immBin = encodeImmediate12Bits(immVal);
  return `${immBin}${rs1Bin}${instrData.funct3}${rdBin}${instrData.opcode}`.slice(-32);
}

/**
 * Decodifica una instrucción binaria de tipo I especial (jalr).
 * <para></para>
 * Convierte una cadena binaria de 32 bits a una instrucción RISC-V legible.
 */
export function decodeSpecialITypeProgressive(binary: string): string | null {
  if (!binary || binary.length === 0) return null;
  const padded = binary.padStart(32, '0');
  const opcode = padded.slice(-7);

  // Buscar instrucción especial por opcode y funct3
  const funct3 = padded.slice(17, 20);
  const entry = Object.entries(specialIInstructions).find(
    ([, data]) => data.opcode === opcode && data.funct3 === funct3
  );

  if (!entry) return null;

  const rdBin = padded.slice(20, 25);
  const rs1Bin = padded.slice(12, 17);
  const immBin = padded.slice(0, 12);

  // Convertir inmediato con signo
  let imm = parseInt(immBin, 2);
  if (immBin[0] === '1') imm -= 1 << 12;

  const rd = `x${parseInt(rdBin, 2)}`;
  const rs1 = `x${parseInt(rs1Bin, 2)}`;

  // jalr usa formato jalr rd, imm(rs1)
  return `${entry[0]} ${rd}, ${imm}(${rs1})`;
}
