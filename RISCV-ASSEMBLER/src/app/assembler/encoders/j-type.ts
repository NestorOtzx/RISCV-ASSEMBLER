import { jInstructions } from '../instruction-tables';
import { registerToBinary, parseImmediate } from '../utils';

export function assembleJTypeProgressive(
  instruction: string,
  memoryWidth: 8 | 32,
  labelMap?: Record<string, number>,
  currentAddress?: number
): string | null {
  const tokens = instruction.trim().split(/[\s,()]+/);
  const mnemonic = tokens[0];
  if (mnemonic !== 'jal') return null;

  const rdBin = registerToBinary(tokens[1]);
  const target = tokens[2];
  if (!target){ return null;}

  let immVal = 0;

  const isNumeric = /^[-+]?\d+$/.test(target) || /^0x[0-9a-fA-F]+$/.test(target);
  if (!isNumeric && labelMap && currentAddress !== undefined) {
    if (!labelMap.hasOwnProperty(target)) return null;
    const targetAddress = labelMap[target];
    immVal = targetAddress - currentAddress;
  } else {
    immVal = parseImmediate(target);
  }

  // Convertimos a binario con signo (21 bits, incluye el bit de signo)
  const immBin = (immVal & 0x1FFFFF).toString(2).padStart(21, immVal < 0 ? '1' : '0');

  // Partes del inmediato (numeradas de 0 a 20, bit 20 = MSB)
  const imm20 = immBin[0];              // bit 20
  const imm19_12 = immBin.slice(1, 9);  // bits 19–12
  const imm11 = immBin[9];              // bit 11
  const imm10_1 = immBin.slice(10, 20); // bits 10–1

  // Concatenación según formato JAL: 20|10:1|11|19:12
  const finalBin =
    imm20 +
    imm10_1 +
    imm11 +
    imm19_12 +
    rdBin +
    jInstructions.jal.opcode;

  // ✅ Esto ahora produce 11111101100111111111000011101111 para jal x1, -40
  return finalBin.padStart(32, immVal < 0 ? '1' : '0');
}

export function decodeJTypeProgressive(binary: string, memoryWidth: 8 | 32): string | null {
  if (!binary || binary.length < 32) return null;
  const padded = binary.padStart(32, '0');

  const opcode = padded.slice(-7);
  if (opcode !== jInstructions.jal.opcode) return null;

  const rdBin = padded.slice(20, 25);

  // Extraer según formato: 20|10:1|11|19:12
  const imm20 = padded[0];
  const imm10_1 = padded.slice(1, 11);
  const imm11 = padded[11];
  const imm19_12 = padded.slice(12, 20);

  // Reconstruimos el inmediato lógico
  const immBin = imm20 + imm19_12 + imm11 + imm10_1 + '0';
  let imm = parseInt(immBin, 2);
  if (immBin[0] === '1') imm -= 1 << 21; // signo

  const rd = `x${parseInt(rdBin, 2)}`;
  return `jal ${rd}, ${imm}`;
}
