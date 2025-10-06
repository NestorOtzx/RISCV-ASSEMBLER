import { iInstructions } from '../instruction-tables';
import { registerToBinary,  encodeImmediate12Bits, parseImmediate} from '../utils';

export function assembleITypeProgressive(instruction: string): string | null {
  const tokens = instruction.trim().split(/[\s,()]+/);
  const mnemonic = tokens[0];
  const instrData = iInstructions[mnemonic as keyof typeof iInstructions];
  if (!instrData) return null;

  const rdBin = registerToBinary(tokens[1]);
  let rs1Bin = '00000';
  let immVal = 0;

  if (instrData.opcode === '0010011') {
    rs1Bin = registerToBinary(tokens[2]);
    if (tokens[3] !== undefined) {
      immVal = parseImmediate(tokens[3]);
    }
  }

  if (instrData.opcode === '0000011') {
    if (tokens.length >= 3) {
      immVal = parseImmediate(tokens[2]);
    }
    if (tokens.length >= 4) {
      rs1Bin = registerToBinary(tokens[3]);
    }
  }

  let immBin = '';

  if (mnemonic === 'slli' || mnemonic === 'srli' || mnemonic === 'srai') {
    const shamt = immVal & 0b11111;
    const funct7 = instrData.funct7 ?? '0000000';
    immBin = funct7 + shamt.toString(2).padStart(5, '0');
  } else {
    immBin = encodeImmediate12Bits(immVal);
  }

  return `${immBin}${rs1Bin}${instrData.funct3}${rdBin}${instrData.opcode}`.slice(-32);
}

export function decodeITypeProgressive(binary: string): string | null {
  if (!binary || binary.length === 0) return null;
  const padded = binary.padStart(32, '0');

  const opcode = padded.slice(-7);
  const rdBin = padded.slice(20, 25);
  const funct3 = padded.slice(17, 20);
  const rs1Bin = padded.slice(12, 17);
  const immBin = padded.slice(0, 12);

  const funct7 = immBin.slice(0, 7);
  const shamtBin = immBin.slice(7, 12);

  // 🔹 Buscar coincidencia exacta con opcode + funct3 + funct7 (si aplica)
  let entry = Object.entries(iInstructions).find(
    ([, data]) =>
      data.opcode === opcode &&
      (!data.funct3 || data.funct3 === funct3) &&
      (!data.funct7 || data.funct7 === funct7)
  );

  // 🔸 Si no encontramos por funct7, relajamos la búsqueda
  if (!entry) {
    entry = Object.entries(iInstructions).find(
      ([, data]) => data.opcode === opcode && data.funct3 === funct3
    );
  }

  if (!entry) return null;

  const mnemonic = entry[0];
  const rd = `x${parseInt(rdBin, 2)}`;
  const rs1 = `x${parseInt(rs1Bin, 2)}`;

  let imm: number;

  if (mnemonic === 'slli' || mnemonic === 'srli' || mnemonic === 'srai') {
    // Desplazamientos: el inmediato son los bits [7–11]
    imm = parseInt(shamtBin, 2);
  } else {
    // Inmediato de 12 bits con signo
    const rawImm = parseInt(immBin, 2);
    imm = immBin[0] === '1' ? rawImm - 0x1000 : rawImm;
  }

  // 🔹 Detección de instrucciones tipo carga (usan imm(rs1))
  const isLoad =
    mnemonic.startsWith('l') && // lw, lb, lh, lbu, lhu
    opcode === '0000011';

  if (isLoad) {
    return `${mnemonic} ${rd}, ${imm}(${rs1})`;
  }

  // 🔹 Resto de instrucciones tipo I (usan rd, rs1, imm)
  return `${mnemonic} ${rd}, ${rs1}, ${imm}`;
}
