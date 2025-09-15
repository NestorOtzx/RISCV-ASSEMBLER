import { assembleRTypeProgressive, decodeRTypeProgressive} from './encoders/r-type';
import { assembleITypeProgressive, decodeITypeProgressive } from './encoders/i-type';
import { assembleSTypeProgressive, decodeSTypeProgressive } from './encoders/s-type';
import { assembleBTypeProgressive, decodeBTypeProgressive } from './encoders/b-type';
import { assembleSpecialITypeProgressive, decodeSpecialITypeProgressive} from './encoders/special-i-type';
import { assembleUTypeProgressive, decodeUTypeProgressive } from './encoders/u-type';
import { assembleJTypeProgressive, decodeJTypeProgressive } from './encoders/j-type';

export type TranslationResult = {
  output: string[];
  labelMap: Record<string, number>;
  errors: { line: number; message: string }[];
  lineMapping: number[]; // editor line → output line, -1 si no existe
};
  

export function RiscVToBinary(lines: string[]): TranslationResult {
    const output: string[] = [];
    const labelMap: Record<string, number> = {};
    const errors: { line: number; message: string }[] = [];
    const lineMapping: number[] = [];

    let instructionAddress = 0;

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) {
        lineMapping.push(-1); // línea vacía → no hay output
        return;
      }

      const isLabel = /^[a-zA-Z_][a-zA-Z0-9_]*:$/.test(trimmed);
      if (isLabel) {
        const labelName = trimmed.replace(':', '');
        if (labelMap.hasOwnProperty(labelName)) {
          errors.push({ line: i + 1, message: `Duplicated label "${labelName}"` });
        } else {
          labelMap[labelName] = instructionAddress;
        }
        lineMapping.push(-1); // etiquetas no generan output
        return;
      }

      let binary = assembleRTypeProgressive(trimmed)
        || assembleITypeProgressive(trimmed)
        || assembleSTypeProgressive(trimmed)
        || assembleBTypeProgressive(trimmed)
        || assembleSpecialITypeProgressive(trimmed)
        || assembleUTypeProgressive(trimmed)
        || assembleJTypeProgressive(trimmed);

      if (!binary) {
        if (trimmed.length > 0) errors.push({ line: i + 1, message: 'Invalid instruction' });
        lineMapping.push(-1);
        return;
      }

      instructionAddress++;
      lineMapping.push(output.length); // mapeo: editor line → índice en output
      output.push(binary);
    });

    return { output, labelMap, errors, lineMapping };
  }


export function BinaryToRiscV(lines: string[]): TranslationResult {
  const output: string[] = [];
  const labelMap: Record<string, number> = {};
  const errors: { line: number; message: string }[] = [];
  const lineMapping: number[] = [];

  let instructionAddress = 0;

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      lineMapping.push(-1);
      return;
    }

    // Validar etiqueta (aunque sea binario, puede haber pseudo-etiquetas para branch)
    const isLabel = /^[a-zA-Z_][a-zA-Z0-9_]*:$/.test(trimmed);
    if (isLabel) {
      const labelName = trimmed.replace(':', '');
      if (labelMap.hasOwnProperty(labelName)) {
        errors.push({ line: i + 1, message: `Duplicated label "${labelName}"` });
      } else {
        labelMap[labelName] = instructionAddress;
      }
      lineMapping.push(-1);
      return;
    }

    // Decodificar progresivamente cada tipo
    console.log(decodeITypeProgressive("00000000001100010000000010010011"));
    const decoded =
      decodeRTypeProgressive(trimmed) ||
      decodeITypeProgressive(trimmed) ||
      decodeSTypeProgressive(trimmed) ||
      decodeBTypeProgressive(trimmed) ||
      decodeSpecialITypeProgressive(trimmed) ||
      decodeUTypeProgressive(trimmed) ||
      decodeJTypeProgressive(trimmed);

    if (!decoded) {
      errors.push({ line: i + 1, message: 'Invalid or incomplete binary instruction' });
      lineMapping.push(-1);
      return;
    }

    instructionAddress++;
    lineMapping.push(output.length);

    output.push(decoded);
  });

  return { output, labelMap, errors, lineMapping };
}


// 1️⃣ Binario → Hexadecimal
export function BinaryToHex(lines: string[]): TranslationResult {
  const output: string[] = [];
  const errors: { line: number; message: string }[] = [];
  const lineMapping: number[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      lineMapping.push(-1);
      return;
    }

    try {
      const hex = `0x${parseInt(trimmed, 2).toString(16).padStart(8, '0')}`;
      output.push(hex);
      lineMapping.push(output.length - 1);
    } catch {
      errors.push({ line: i + 1, message: 'Invalid binary string' });
      lineMapping.push(-1);
    }
  });

  return { output, labelMap: {}, errors, lineMapping };
}

// 2️⃣ Hexadecimal → Binario
export function HexToBinary(lines: string[]): TranslationResult {
  const output: string[] = [];
  const errors: { line: number; message: string }[] = [];
  const lineMapping: number[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim().replace(/^0x/i, '');
    if (!trimmed) {
      lineMapping.push(-1);
      return;
    }

    try {
      const binary = parseInt(trimmed, 16).toString(2).padStart(32, '0');
      output.push(binary);
      lineMapping.push(output.length - 1);
    } catch {
      errors.push({ line: i + 1, message: 'Invalid hexadecimal string' });
      lineMapping.push(-1);
    }
  });

  return { output, labelMap: {}, errors, lineMapping };
}

// 3️⃣ Valor por defecto (no hace conversión)
export function NoConversion(lines: string[]): TranslationResult {
  const output: string[] = [...lines];
  const lineMapping = lines.map((_, i) => i);
  return {
    output,
    labelMap: {},      // Sin etiquetas detectadas
    errors: [],        // Sin errores
    lineMapping        // Mapeo directo
  };
}