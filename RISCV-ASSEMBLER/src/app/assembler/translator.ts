import { assembleRTypeProgressive, decodeRTypeProgressive} from './encoders/r-type';
import { assembleITypeProgressive, decodeITypeProgressive } from './encoders/i-type';
import { assembleSTypeProgressive, decodeSTypeProgressive } from './encoders/s-type';
import { assembleBTypeProgressive, decodeBTypeProgressive } from './encoders/b-type';
import { assembleSpecialITypeProgressive, decodeSpecialITypeProgressive} from './encoders/special-i-type';
import { assembleUTypeProgressive, decodeUTypeProgressive } from './encoders/u-type';
import { assembleJTypeProgressive, decodeJTypeProgressive } from './encoders/j-type';
import { bInstructions, jInstructions } from './instruction-tables';

export type TranslationResult = {
  output: string[];
  labelMap: Record<string, number>;
  errors: { line: number; message: string }[];
  editorToOutput: number[];
  outputToEditor: number[];
};

  
export function RiscVToBinary(lines: string[], memoryWidth: 8 | 32): TranslationResult {
  const output: string[] = [];
  const labelMap: Record<string, number> = {};
  const pendingBranches: { lineIndex: number; instruction: string }[] = [];
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

    const tokens = trimmed.split(/[\s,()]+/);
    const mnemonic = tokens[0];

    const target = tokens[3] ?? tokens[2];

    const isBType = mnemonic in bInstructions;
    const isJType = mnemonic in jInstructions;

    if ((isBType || isJType) && target && isNaN(Number(target))) {
      pendingBranches.push({ lineIndex: i, instruction: trimmed });
    }

    const binary =
      assembleRTypeProgressive(trimmed) ||
      assembleITypeProgressive(trimmed) ||
      assembleSTypeProgressive(trimmed) ||
      assembleBTypeProgressive(trimmed, memoryWidth) ||
      assembleSpecialITypeProgressive(trimmed) ||
      assembleUTypeProgressive(trimmed) ||
      assembleJTypeProgressive(trimmed, memoryWidth);

    if (!binary) {
      errors.push({ line: i + 1, message: 'Invalid instruction' });
      editorToOutput.push(-1);
      return;
    }

    output.push(binary);
    editorToOutput.push(output.length - 1);
    outputToEditor.push(i);
    instructionAddress++;
  });

  for (const { lineIndex, instruction } of pendingBranches) {
    const tokens = instruction.split(/[\s,()]+/);
    const mnemonic = tokens[0];
    const target = tokens[3] ?? tokens[2];
    const outputIndex = editorToOutput[lineIndex];

    if (outputIndex < 0 || outputIndex === undefined) continue;

    if (!labelMap.hasOwnProperty(target)) {
      errors.push({ line: lineIndex + 1, message: `Undefined label "${target}"` });
      continue;
    }

    let resolved: string | null = null;

    if (mnemonic in bInstructions) {
      resolved = assembleBTypeProgressive(instruction, memoryWidth, labelMap, outputIndex);
    } else if (mnemonic in jInstructions) {
      resolved = assembleJTypeProgressive(instruction, memoryWidth, labelMap, outputIndex);
    }

    if (!resolved) {
      errors.push({ line: lineIndex + 1, message: 'Could not resolve label' });
      continue;
    }

    output[outputIndex] = resolved;
  }

  return { output, labelMap, errors, editorToOutput, outputToEditor };
}


export function BinaryToRiscV(lines: string[], memoryWidth: 8 | 32): TranslationResult {
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

    const decoded =
      decodeRTypeProgressive(trimmed) ||
      decodeITypeProgressive(trimmed) ||
      decodeSTypeProgressive(trimmed) ||
      decodeBTypeProgressive(trimmed, memoryWidth) ||
      decodeSpecialITypeProgressive(trimmed) ||
      decodeUTypeProgressive(trimmed) ||
      decodeJTypeProgressive(trimmed, memoryWidth);

    if (!decoded) {
      errors.push({ line: i + 1, message: 'Invalid or incomplete binary instruction' });
      editorToOutput.push(-1);
      return;
    }

    instructionAddress++;
    output.push(decoded);

    editorToOutput.push(output.length - 1); 
    outputToEditor.push(i);
  });

  return { output, labelMap, errors, editorToOutput, outputToEditor };
}


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

      editorToOutput.push(output.length - 1); 
      outputToEditor.push(i);
    } catch {
      errors.push({ line: i + 1, message: 'Invalid binary string' });
      editorToOutput.push(-1);
    }
  });

  return { output, labelMap: {}, errors, editorToOutput, outputToEditor };
}


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

      editorToOutput.push(output.length - 1); 
      outputToEditor.push(i);
    } catch {
      errors.push({ line: i + 1, message: 'Invalid hexadecimal string' });
      editorToOutput.push(-1);
    }
  });

  return { output, labelMap: {}, errors, editorToOutput, outputToEditor };
}

export function RiscVToRiscV(lines: string[], memoryWidth: 8 | 32): TranslationResult {
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

    const binary =
      assembleRTypeProgressive(trimmed) ||
      assembleITypeProgressive(trimmed) ||
      assembleSTypeProgressive(trimmed) ||
      assembleBTypeProgressive(trimmed, memoryWidth) ||
      assembleSpecialITypeProgressive(trimmed) ||
      assembleUTypeProgressive(trimmed) ||
      assembleJTypeProgressive(trimmed, memoryWidth);

    if (!binary) {
      errors.push({ line: i + 1, message: 'Invalid RISC-V instruction' });
      editorToOutput.push(-1);
      return;
    }

    const decoded =
      decodeRTypeProgressive(binary) ||
      decodeITypeProgressive(binary) ||
      decodeSTypeProgressive(binary) ||
      decodeBTypeProgressive(binary, memoryWidth) ||
      decodeSpecialITypeProgressive(binary) ||
      decodeUTypeProgressive(binary) ||
      decodeJTypeProgressive(binary, memoryWidth);

    if (!decoded) {
      errors.push({ line: i + 1, message: 'Could not normalize instruction' });
      editorToOutput.push(-1);
      return;
    }

    instructionAddress++;
    output.push(decoded);
    editorToOutput.push(output.length - 1);
    outputToEditor.push(i);
  });

  return { output, labelMap, errors, editorToOutput, outputToEditor };
}


export function BinaryToBinary(lines: string[], memoryWidth: 8 | 32): TranslationResult {
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
    const decoded =
      decodeRTypeProgressive(trimmed) ||
      decodeITypeProgressive(trimmed) ||
      decodeSTypeProgressive(trimmed) ||
      decodeBTypeProgressive(trimmed, memoryWidth) ||
      decodeSpecialITypeProgressive(trimmed) ||
      decodeUTypeProgressive(trimmed) ||
      decodeJTypeProgressive(trimmed, memoryWidth);

    if (!decoded) {
      errors.push({ line: i + 1, message: 'Invalid or incomplete binary instruction' });
      editorToOutput.push(-1);
      return;
    }
    const reassembled =
      assembleRTypeProgressive(decoded) ||
      assembleITypeProgressive(decoded) ||
      assembleSTypeProgressive(decoded) ||
      assembleBTypeProgressive(decoded, memoryWidth) ||
      assembleSpecialITypeProgressive(decoded) ||
      assembleUTypeProgressive(decoded) ||
      assembleJTypeProgressive(decoded, memoryWidth);

    if (!reassembled) {
      errors.push({ line: i + 1, message: 'Could not reassemble binary instruction' });
      editorToOutput.push(-1);
      return;
    }

    output.push(reassembled);
    editorToOutput.push(output.length - 1);
    outputToEditor.push(i);
  });

  return { output, labelMap: {}, errors, editorToOutput, outputToEditor };
}



export function HexToHex(lines: string[], memoryWidth: 8 | 32): TranslationResult {
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

      const decoded =
        decodeRTypeProgressive(binary) ||
        decodeITypeProgressive(binary) ||
        decodeSTypeProgressive(binary) ||
        decodeBTypeProgressive(binary, memoryWidth) ||
        decodeSpecialITypeProgressive(binary) ||
        decodeUTypeProgressive(binary) ||
        decodeJTypeProgressive(binary, memoryWidth);

      if (!decoded) {
        errors.push({ line: i + 1, message: 'Invalid or incomplete hex instruction' });
        editorToOutput.push(-1);
        return;
      }

      const reassembled =
        assembleRTypeProgressive(decoded) ||
        assembleITypeProgressive(decoded) ||
        assembleSTypeProgressive(decoded) ||
        assembleBTypeProgressive(decoded, memoryWidth) ||
        assembleSpecialITypeProgressive(decoded) ||
        assembleUTypeProgressive(decoded) ||
        assembleJTypeProgressive(decoded, memoryWidth);

      if (!reassembled) {
        errors.push({ line: i + 1, message: 'Could not reassemble hex instruction' });
        editorToOutput.push(-1);
        return;
      }

      const hex = `0x${parseInt(reassembled, 2).toString(16).padStart(8, '0')}`;
      output.push(hex);

      editorToOutput.push(output.length - 1);
      outputToEditor.push(i);
    } catch {
      errors.push({ line: i + 1, message: 'Invalid hex string' });
      editorToOutput.push(-1);
    }
  });

  return { output, labelMap: {}, errors, editorToOutput, outputToEditor };
}

export function NoConversion(lines: string[]): TranslationResult {
  const output: string[] = [...lines];
  const editorToOutput: number[] = [];
  const outputToEditor: number[] = [];

  lines.forEach((_, i) => {
    editorToOutput.push(i); 
    outputToEditor.push(i); 
  });

  return {
    output,
    labelMap: {},    
    errors: [],
    editorToOutput,
    outputToEditor
  };
}
