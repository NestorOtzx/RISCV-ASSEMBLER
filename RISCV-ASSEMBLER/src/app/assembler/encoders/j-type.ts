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
  if (!target) return null;

  let immVal = 0;
  const isNumeric = /^[-+]?\d+$/.test(target) || /^0x[0-9a-fA-F]+$/.test(target);

  // Calculate label offsets
  if (!isNumeric && labelMap && currentAddress !== undefined) {
    if (!labelMap.hasOwnProperty(target)) return null;
    const targetAddress = labelMap[target];
    // Jumps are in instruction units if memoryWidth = 32, or byte units if memoryWidth = 8
    immVal = memoryWidth === 8
      ? (targetAddress - currentAddress) * 4
      : (targetAddress - currentAddress);
  } else {
    immVal = parseImmediate(target);
  }

  // In memoryWidth=8 → standard RISC-V (21 bits, discard bit 0)
  // In memoryWidth=32 → discard bit 20, keep bit 0
  let immBin: string;

  if (memoryWidth === 8) {
    immBin = (immVal & 0x1FFFFF).toString(2).padStart(21, immVal < 0 ? '1' : '0');
  } else {
    // For 32-bit memory, shift immediate left to drop bit 20 and keep bit 0
    const masked = immVal & 0xFFFFF; // keep 20 LSBs (0..19)
    immBin = masked.toString(2).padStart(20, immVal < 0 ? '1' : '0');
    immBin = immBin + (immVal < 0 ? '1' : '0'); // pad to 21 bits for layout consistency
  }

  // Bit layout (bit 20 = MSB):
  const imm20 = memoryWidth === 8 ? immBin[0] : immBin[1]; // bit 19 becomes new sign bit
  const imm19_12 = immBin.slice(1, 9);
  const imm11 = immBin[9];
  const imm10_1 = immBin.slice(10, 20);

  const finalBin =
    imm20 +
    imm10_1 +
    imm11 +
    imm19_12 +
    rdBin +
    jInstructions.jal.opcode;

  return finalBin.padStart(32, immVal < 0 ? '1' : '0');
}

export function decodeJTypeProgressive(binary: string, memoryWidth: 8 | 32): string | null {
  if (!binary || binary.length < 32) return null;
  const padded = binary.padStart(32, '0');
  const opcode = padded.slice(-7);
  if (opcode !== jInstructions.jal.opcode) return null;

  const rdBin = padded.slice(20, 25);

  // Extract J-type fields: 20|10:1|11|19:12
  const imm20 = padded[0];
  const imm10_1 = padded.slice(1, 11);
  const imm11 = padded[11];
  const imm19_12 = padded.slice(12, 20);

  // Rebuild immediate bits
  let immBin = imm20 + imm19_12 + imm11 + imm10_1;
  if (memoryWidth === 8) {
    immBin += '0'; // Standard J-type: bit0 always 0
  }

  let imm = parseInt(immBin, 2);
  if (immBin[0] === '1') imm -= 1 << immBin.length;

  const rd = `x${parseInt(rdBin, 2)}`;
  return `jal ${rd}, ${imm}`;
}
