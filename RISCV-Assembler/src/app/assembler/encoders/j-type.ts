import { jInstructions } from '../instruction-tables';
import { registerToBinary,  encodeImmediate12Bits, parseImmediate} from '../utils';

export function assembleJTypeProgressive(
  instruction: string,
  labelMap?: Record<string, number>,
  currentAddress?: number
): string | null {
  const tokens = instruction.trim().split(/[\s,()]+/);
  const mnemonic = tokens[0];
  if (mnemonic !== 'jal') return null;

  const rdBin = registerToBinary(tokens[1]);
  const target = tokens[2];
  if (!target) return null;

  let immVal = 0;

  // Si el target es una etiqueta y tenemos un labelMap válido, resolvemos
  const isNumeric = /^[-+]?\d+$/.test(target) || /^0x[0-9a-fA-F]+$/.test(target);
  if (!isNumeric && labelMap && currentAddress !== undefined) {
    if (!labelMap.hasOwnProperty(target)) {
      // Etiqueta no definida
      return null;
    }
    const targetAddress = labelMap[target];
    immVal = (targetAddress - currentAddress) * 4; // offset relativo en bytes
  } else {
    // Numérico: inmediato directo
    immVal = parseImmediate(target);
  }

  // Offsets son múltiplos de 2
  const imm = (immVal >> 1) & 0xFFFFF;
  const immBin = imm.toString(2).padStart(20, (imm & 0x80000) ? '1' : '0');

  const imm20 = immBin[0] || '0';
  const imm19_12 = immBin.slice(1, 9).padEnd(8, '0');
  const imm11 = immBin[9] || '0';
  const imm10_1 = immBin.slice(10).padEnd(10, '0');

  return `${imm20}${imm19_12}${imm11}${imm10_1}${rdBin}${jInstructions.jal.opcode}`.slice(-32);
}

export function decodeJTypeProgressive(binary: string): string | null {
  if (!binary || binary.length === 0) return null;
  const padded = binary.padStart(32, '0');

  const opcode = padded.slice(-7);

  // Solo decodificar si es jal (opcode 1101111)
  if (opcode !== jInstructions.jal.opcode) return null;

  const rdBin = padded.slice(20, 25);
  const imm20 = padded[0] || '0';
  const imm10_1 = padded.slice(21, 31).padEnd(10, '0');
  const imm11 = padded[31] || '0';
  const imm19_12 = padded.slice(1, 9).padEnd(8, '0');

  const immBin = imm20 + imm19_12 + imm11 + imm10_1 + '0';
  const imm = parseInt(immBin, 2);

  const rd = rdBin ? `x${parseInt(rdBin, 2)}` : '';

  return `jal ${rd} ${imm}`.trim();
}