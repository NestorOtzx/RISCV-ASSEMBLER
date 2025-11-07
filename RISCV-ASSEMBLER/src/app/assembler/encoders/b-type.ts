import { ConstantPool } from '@angular/compiler';
import { bInstructions } from '../instruction-tables';
import { registerToBinary, parseImmediate} from '../utils';


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

  // Si nos pasaron labelMap y currentAddress, y el token 3 es una etiqueta conocida,
  // lo convertimos a desplazamiento en bytes tal como si el usuario hubiera escrito -4, 8, etc.
  if (labelMap && currentAddress !== undefined) {
    const target = tokens[3];
    if (target && !/^[-+]?\d+$/.test(target) && !/^0x/i.test(target)) {
      if (labelMap.hasOwnProperty(target)) {
        const labelAddress = labelMap[target]; // índice de instrucción
        // diferencia en bytes entre destino y la instrucción actual:
        const byteOffset = (labelAddress - currentAddress) * 4;
        tokens[3] = byteOffset.toString();
      }
    }
  }

  const immVal = tokens[3] !== undefined ? parseImmediate(tokens[3]) : 0;

  const imm = immVal & 0x1FFF; 
  const immBin = imm.toString(2).padStart(13, (immVal < 0 ? '1' : '0'));
  const imm12  = immBin[0];              // bit 12
  const imm10_5 = immBin.slice(2, 8);    // bits 10–5
  const imm4_1  = immBin.slice(8, 12);   // bits 4–1
  const imm11   = immBin[1];             // bit 11
  return `${imm12}${imm10_5}${rs2Bin}${rs1Bin}${instrData.funct3}${imm4_1}${imm11}${instrData.opcode}`.slice(-32);

}


export function decodeBTypeProgressive(binary: string, memoryWidth: 8 | 32): string | null {
  if (!binary || binary.length === 0) return null;
  const padded = binary.padStart(32, '0');

  const opcode = padded.slice(-7);
  const funct3 = padded.slice(17, 20);
  const rs1Bin = padded.slice(12, 17);
  const rs2Bin = padded.slice(7, 12);

  // Extraemos bits del inmediato en el orden correcto según el formato B-type
  const imm12 = padded[0];                    // bit 12 (sign)
  const imm10_5 = padded.slice(1, 7);         // bits 10:5
  const imm4_1 = padded.slice(20, 24);        // bits 4:1
  const imm11 = padded[24];                   // bit 11
  const immBin = imm12 + imm11 + imm10_5 + imm4_1 + '0'; // se agrega el bit 0 (siempre 0)

  // Interpretar como número con signo (13 bits)
  let imm = parseInt(immBin, 2);
  if (immBin[0] === '1') {
    imm -= 1 << immBin.length; // complemento a dos
  }

  const entry = Object.entries(bInstructions).find(
    ([, data]) => data.opcode === opcode && data.funct3 === funct3
  );

  if (!entry) return null;

  const mnemonic = entry[0];
  const rs1 = `x${parseInt(rs1Bin, 2)}`;
  const rs2 = `x${parseInt(rs2Bin, 2)}`;

  return `${mnemonic} ${rs1}, ${rs2}, ${imm}`;
}
