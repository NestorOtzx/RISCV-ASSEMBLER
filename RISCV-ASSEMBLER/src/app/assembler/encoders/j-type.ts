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
  let target = tokens[2];
  if (!target){
    target = "0";
  }

  let immVal = 0;
  const isNumeric = /^[-+]?\d+$/.test(target) || /^0x[0-9a-fA-F]+$/.test(target);

  if (!isNumeric && labelMap && currentAddress !== undefined) {
    if (!labelMap.hasOwnProperty(target)) return null;
    const targetAddress = labelMap[target];
    immVal = memoryWidth === 8
      ? (targetAddress - currentAddress) * 4
      : (targetAddress - currentAddress);
  } else {
    immVal = parseImmediate(target);
  }

  let immBin: string;

  if (memoryWidth === 8) {
    immBin = (immVal & 0x1FFFFF).toString(2).padStart(21, immVal < 0 ? '1' : '0');
  } else {
    const masked = immVal & 0xFFFFF; 
    immBin = masked.toString(2).padStart(20, immVal < 0 ? '1' : '0');
    immBin = immBin + (immVal < 0 ? '1' : '0'); 
  }

  const imm20 = memoryWidth === 8 ? immBin[0] : immBin[1]; 
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

  const imm20 = padded[0];
  const imm10_1 = padded.slice(1, 11);
  const imm11 = padded[11];
  const imm19_12 = padded.slice(12, 20);

  let immBin = imm20 + imm19_12 + imm11 + imm10_1;
  if (memoryWidth === 8) {
    immBin += '0'; 
  }

  let imm = parseInt(immBin, 2);
  if (immBin[0] === '1') imm -= 1 << immBin.length;

  const rd = `x${parseInt(rdBin, 2)}`;
  return `jal ${rd}, ${imm}`;
}
