import { bInstructions } from '../instruction-tables';
import { registerToBinary, parseImmediate } from '../utils';

export function assembleBTypeProgressive(
  instruction: string,
  memoryWidth: 8 | 32,
  labelMap?: Record<string, number>,
  currentAddress?: number,
): string | null {
  const tokens = instruction.trim().split(/[\s,()]+/);
  const mnemonic = tokens[0];
  const instrData = bInstructions[mnemonic as keyof typeof bInstructions];
  if (!instrData) return null;

  const rs1Bin = registerToBinary(tokens[1]);
  const rs2Bin = registerToBinary(tokens[2]);

  // Resolve label -> offset according to memoryWidth
  if (labelMap && currentAddress !== undefined) {
    const target = tokens[3];
    if (target && !/^[-+]?\d+$/.test(target) && !/^0x/i.test(target)) {
      if (labelMap.hasOwnProperty(target)) {
        const labelAddress = labelMap[target];
        const offset =
          memoryWidth === 8
            ? (labelAddress - currentAddress) * 4 // bytes
            : (labelAddress - currentAddress);    // instruction units
        tokens[3] = offset.toString();
      }
    }
  }

  const immValRaw = tokens[3] !== undefined ? parseImmediate(tokens[3]) : 0;

  // --- Build bit pattern depending on mode ---
  if (memoryWidth === 8) {
    // Standard: immediate is 13 bits (imm[12:0]); LSB implicit 0 when stored.
    const imm = immValRaw & 0x1FFF; // 13 bits
    const immBin = imm.toString(2).padStart(13, immValRaw < 0 ? '1' : '0'); // 13 chars

    const imm12  = immBin[0];             // imm[12]
    const imm11  = immBin[1];             // imm[11]
    const imm10_5 = immBin.slice(2, 8);   // imm[10:5]
    const imm4_1  = immBin.slice(8, 12);  // imm[4:1]

    const final = `${imm12}${imm10_5}${rs2Bin}${rs1Bin}${instrData.funct3}${imm4_1}${imm11}${instrData.opcode}`;
    return final.slice(-32);
  } else {
    // memoryWidth === 32 : Option A mapping
    // We WANT to discard original imm[12] and keep imm[0].
    // So take the lower 12 bits orig[11..0] and map them into the stored fields:
    // stored imm12  <- orig[11] (new sign)
    // stored imm11  <- orig[10]
    // stored imm10:5 <- orig[9..4]
    // stored imm4:1  <- orig[3..0]
    //
    // immValRaw here is in instruction-units (not bytes).
    const orig = immValRaw & 0x1FFF; // keep 13 bits to be safe (signed), but we'll drop bit12
    // Extract orig[11..0] (lower 12 bits)
    const lower12 = orig & 0x0FFF; // bits 11..0

    // Build a 12-bit binary string representing orig[11..0]
    // Use sign propagation from original immValRaw: compute signed lower12 representation
    // We'll reconstruct sign from bit11 (new sign).
    let lower12Bin = (lower12 >>> 0).toString(2).padStart(12, '0'); // unsigned repr
    // If immValRaw negative, we must sign-extend correctly to match user's intent.
    // To keep it simple and correct for negative numbers, derive a signed 13-bit then take bits 11..0:
    if (immValRaw < 0) {
      // Create signed 13-bit representation, then drop MSB and take lower 12 bits
      const signed13 = (immValRaw & 0x1FFF) >>> 0;
      const signedLower12 = signed13 & 0x0FFF;
      lower12Bin = signedLower12.toString(2).padStart(12, '1'); // leading ones for negative
    }

    // Now map into stored fields:
    const stored_imm12 = lower12Bin[0];            // new sign = orig[11]
    const stored_imm11 = lower12Bin[1];            // orig[10]
    const stored_imm10_5 = lower12Bin.slice(2, 8); // orig[9..4]
    const stored_imm4_1  = lower12Bin.slice(8, 12);// orig[3..0]

    const final = `${stored_imm12}${stored_imm10_5}${rs2Bin}${rs1Bin}${instrData.funct3}${stored_imm4_1}${stored_imm11}${instrData.opcode}`;
    return final.slice(-32);
  }
}


export function decodeBTypeProgressive(binary: string, memoryWidth: 8 | 32): string | null {
  if (!binary || binary.length === 0) return null;
  const padded = binary.padStart(32, '0');

  const opcode = padded.slice(-7);
  const funct3 = padded.slice(17, 20);
  const rs1Bin = padded.slice(12, 17);
  const rs2Bin = padded.slice(7, 12);

  // Extract stored fields
  const imm12_field = padded[0];             // stored imm12 (bit 31)
  const imm10_5_field = padded.slice(1, 7);  // stored imm10:5 (bits 30-25)
  const imm4_1_field = padded.slice(20, 24); // stored imm4:1 (bits 11-8)
  const imm11_field = padded[24];            // stored imm11 (bit 7)

  if (memoryWidth === 8) {
    // Standard reconstruction: imm[12] imm[11] imm[10:5] imm[4:1] 0  -> 13 bits
    const immBin13 = imm12_field + imm11_field + imm10_5_field + imm4_1_field + '0';
    let imm = parseInt(immBin13, 2);
    if (immBin13[0] === '1') imm -= 1 << immBin13.length; // sign extend 13 bits
    const entry = Object.entries(bInstructions).find(([, data]) => data.opcode === opcode && data.funct3 === funct3);
    if (!entry) return null;
    const mnemonic = entry[0];
    const rs1 = `x${parseInt(rs1Bin, 2)}`;
    const rs2 = `x${parseInt(rs2Bin, 2)}`;
    return `${mnemonic} ${rs1}, ${rs2}, ${imm}`;
  } else {
    // memoryWidth === 32 -> Option A: stored fields contain orig[11..0]
    // Reconstruct 12-bit sequence: orig[11..0] = stored_imm12, stored_imm11, stored_imm10:5, stored_imm4:1
    const orig12Bin = imm12_field + imm11_field + imm10_5_field + imm4_1_field; // 12 bits
    let imm = parseInt(orig12Bin, 2);
    // Sign extend from 12 bits
    if (orig12Bin[0] === '1') imm -= 1 << orig12Bin.length;

    // imm is in instruction units (no implicit 0 appended, because we kept LSB)
    const entry = Object.entries(bInstructions).find(([, data]) => data.opcode === opcode && data.funct3 === funct3);
    if (!entry) return null;
    const mnemonic = entry[0];
    const rs1 = `x${parseInt(rs1Bin, 2)}`;
    const rs2 = `x${parseInt(rs2Bin, 2)}`;
    return `${mnemonic} ${rs1}, ${rs2}, ${imm}`;
  }
}
