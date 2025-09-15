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
  editorToOutput: number[]; // editor line → output line
  outputToEditor: number[]; // output line → editor line
};

  

export function RiscVToBinary(lines: string[]): TranslationResult {
  const output: string[] = [];
  const labelMap: Record<string, number> = {};
  const errors: { line: number; message: string }[] = [];
  const editorToOutput: number[] = [];
  const outputToEditor: number[] = [];

  let instructionAddress = 0;

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      editorToOutput.push(-1);
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
      editorToOutput.push(-1);
      return;
    }

    let binary =
      assembleRTypeProgressive(trimmed) ||
      assembleITypeProgressive(trimmed) ||
      assembleSTypeProgressive(trimmed) ||
      assembleBTypeProgressive(trimmed) ||
      assembleSpecialITypeProgressive(trimmed) ||
      assembleUTypeProgressive(trimmed) ||
      assembleJTypeProgressive(trimmed);

    if (!binary) {
      errors.push({ line: i + 1, message: 'Invalid instruction' });
      editorToOutput.push(-1);
      return;
    }

    instructionAddress++;
    output.push(binary);
    editorToOutput.push(output.length - 1);   // editor → output
    outputToEditor.push(i);                   // output → editor
  });

  return { output, labelMap, errors, editorToOutput, outputToEditor };
}



export function BinaryToRiscV(lines: string[]): TranslationResult {
  const output: string[] = [];
  const labelMap: Record<string, number> = {};
  const errors: { line: number; message: string }[] = [];
  const editorToOutput: number[] = [];
  const outputToEditor: number[] = [];

  let instructionAddress = 0;

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      editorToOutput.push(-1);
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
      editorToOutput.push(-1);
      return;
    }

    // Decodificar progresivamente cada tipo
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
      editorToOutput.push(-1);
      return;
    }

    instructionAddress++;
    output.push(decoded);

    editorToOutput.push(output.length - 1); // editor → output
    outputToEditor.push(i);                 // output → editor
  });

  return { output, labelMap, errors, editorToOutput, outputToEditor };
}



// 1️⃣ Binario → Hexadecimal
export function BinaryToHex(lines: string[]): TranslationResult {
  const output: string[] = [];
  const errors: { line: number; message: string }[] = [];
  const editorToOutput: number[] = [];
  const outputToEditor: number[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      editorToOutput.push(-1);
      return;
    }

    try {
      const hex = `0x${parseInt(trimmed, 2).toString(16).padStart(8, '0')}`;
      output.push(hex);

      editorToOutput.push(output.length - 1); // editor → output
      outputToEditor.push(i);                 // output → editor
    } catch {
      errors.push({ line: i + 1, message: 'Invalid binary string' });
      editorToOutput.push(-1);
    }
  });

  return { output, labelMap: {}, errors, editorToOutput, outputToEditor };
}


// 2️⃣ Hexadecimal → Binario
export function HexToBinary(lines: string[]): TranslationResult {
  const output: string[] = [];
  const errors: { line: number; message: string }[] = [];
  const editorToOutput: number[] = [];
  const outputToEditor: number[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim().replace(/^0x/i, '');
    if (!trimmed) {
      editorToOutput.push(-1);
      return;
    }

    try {
      const binary = parseInt(trimmed, 16).toString(2).padStart(32, '0');
      output.push(binary);

      editorToOutput.push(output.length - 1); // editor → output
      outputToEditor.push(i);                 // output → editor
    } catch {
      errors.push({ line: i + 1, message: 'Invalid hexadecimal string' });
      editorToOutput.push(-1);
    }
  });

  return { output, labelMap: {}, errors, editorToOutput, outputToEditor };
}


// 3️⃣ Valor por defecto (no hace conversión)
export function NoConversion(lines: string[]): TranslationResult {
  const output: string[] = [...lines];
  const editorToOutput: number[] = [];
  const outputToEditor: number[] = [];

  lines.forEach((_, i) => {
    editorToOutput.push(i); // editor → output (mismo índice)
    outputToEditor.push(i); // output → editor (mismo índice)
  });

  return {
    output,
    labelMap: {},      // Sin etiquetas detectadas
    errors: [],        // Sin errores
    editorToOutput,
    outputToEditor
  };
}
