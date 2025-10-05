import { RiscVToBinary } from '../translator';

describe('RiscVToBinary', () => {

  it('convierte "add x1, x2, x3" correctamente', () => {
    const input = ['add x1, x2, x3'];
    const result = RiscVToBinary(input);

    // opcode=0110011 funct3=000 funct7=0000000
    // rd=00001 rs1=00010 rs2=00011
    const expected = '00000000001100010000000010110011';
    expect(result.output[0]).toBe(expected);
    expect(result.errors.length).toBe(0);
  });

  it('convierte "addi x5, x0, 10" correctamente', () => {
    const input = ['addi x5, x0, 10'];
    const result = RiscVToBinary(input);

    // opcode=0010011 funct3=000
    // rd=00101 rs1=00000 imm=0000000001010
    const expected = '00000000101000000000001010010011';
    expect(result.output[0]).toBe(expected);
    expect(result.errors.length).toBe(0);
  });

  it('convierte "beq x1, x2, etiqueta" con salto hacia adelante', () => {
    const input = [
      'beq x1, x2, etiqueta',
      'add x3, x4, x5',
      'etiqueta: ',
      'addi x6, x0, 1',
    ];
    const result = RiscVToBinary(input);

    // No verificamos bits exactos del branch, solo que haya 3 líneas y sin errores
    expect(result.output.length).toBe(3);
    expect(result.errors.length).toBe(0);
    expect(result.labelMap['etiqueta']).toBe(2);
  });

  it('convierte "jal x1, etiqueta" correctamente con etiqueta adelante', () => {
    const input = [
      'jal x1, etiqueta',
      'addi x2, x0, 5',
      'etiqueta:',
      'add x3, x4, x5',
    ];
    const result = RiscVToBinary(input);

    expect(result.output.length).toBe(3);
    expect(result.errors.length).toBe(0);
    expect(result.labelMap['etiqueta']).toBe(2);
  });

  it('reporta error cuando la etiqueta no está definida', () => {
    const input = ['beq x1, x2, missingLabel'];
    const result = RiscVToBinary(input);

    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toContain('Undefined label');
  });

});
