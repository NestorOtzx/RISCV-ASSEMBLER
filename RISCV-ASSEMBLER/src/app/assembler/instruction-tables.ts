export type Instruction = { funct3?: string; opcode: string; funct7?: string };

export const rInstructions = {
  add:  { funct3: '000', funct7: '0000000', opcode: '0110011' },
  sub:  { funct3: '000', funct7: '0100000', opcode: '0110011' },
  xor:  { funct3: '100', funct7: '0000000', opcode: '0110011' },
  or:   { funct3: '110', funct7: '0000000', opcode: '0110011' },
  and:  { funct3: '111', funct7: '0000000', opcode: '0110011' },
  sll:  { funct3: '001', funct7: '0000000', opcode: '0110011' },
  srl:  { funct3: '101', funct7: '0000000', opcode: '0110011' },
  sra:  { funct3: '101', funct7: '0100000', opcode: '0110011' },
  slt:  { funct3: '010', funct7: '0000000', opcode: '0110011' },
  sltu: { funct3: '011', funct7: '0000000', opcode: '0110011' },
  mul:     { funct3: '000', funct7: '0000001',  opcode: '0110011' },
  mulh:    { funct3: '001', funct7: '0000001',  opcode: '0110011' },
  mulhsu:  { funct3: '010', funct7: '0000001',  opcode: '0110011' },
  mulhu:   { funct3: '011', funct7: '0000001',  opcode: '0110011' },
  div:     { funct3: '100', funct7: '0000001',  opcode: '0110011' },
  divu:    { funct3: '101', funct7: '0000001',  opcode: '0110011' },
  rem:     { funct3: '110', funct7: '0000001',  opcode: '0110011' },
  remu:    { funct3: '111', funct7: '0000001',  opcode: '0110011' },
};

export const iInstructions: { [key: string]: Instruction } = {
  addi:  { funct3: '000', opcode: '0010011', funct7: '0000000' },
  xori:  { funct3: '100', opcode: '0010011', funct7: '0000000' },
  ori:   { funct3: '110', opcode: '0010011', funct7: '0000000' },
  andi:  { funct3: '111', opcode: '0010011', funct7: '0000000' },
  slli:  { funct3: '001', opcode: '0010011', funct7: '0000000' },
  srli:  { funct3: '101', opcode: '0010011', funct7: '0000000' },
  srai:  { funct3: '101', opcode: '0010011', funct7: '0100000' },
  slti:  { funct3: '010', opcode: '0010011', funct7: '0000000' },
  sltiu: { funct3: '011', opcode: '0010011', funct7: '0000000' },

  lb:    { funct3: '000', opcode: '0000011' },
  lh:    { funct3: '001', opcode: '0000011' },
  lw:    { funct3: '010', opcode: '0000011' },
  lbu:   { funct3: '100', opcode: '0000011' },
  lhu:   { funct3: '101', opcode: '0000011' },
};

export const sInstructions = {
  sb: { funct3: '000', opcode: '0100011' },
  sh: { funct3: '001', opcode: '0100011' },
  sw: { funct3: '010', opcode: '0100011' },
};


export const bInstructions = {
  beq:  { funct3: '000', opcode: '1100011' },
  bne:  { funct3: '001', opcode: '1100011' },
  blt:  { funct3: '100', opcode: '1100011' },
  bge:  { funct3: '101', opcode: '1100011' },
  bltu: { funct3: '110', opcode: '1100011' },
  bgeu: { funct3: '111', opcode: '1100011' },
};

export const jInstructions = {
  jal: { opcode: '1101111' },
};

export const uInstructions = {
  lui:   { opcode: '0110111' },
  auipc: { opcode: '0010111' },
};

export const specialIInstructions = {
  jalr:   { funct3: '000', opcode: '1100111' },
};