# RISC-V Assembler

RISC-V Assembler is a web-based tool built with **Angular 20** that
allows conversion between **RISC-V assembly**, **binary**, and
**hexadecimal**.\
It features a dual synchronized editor, memory architecture
configuration, and export tools suitable for digital design workflows.


## Features

-   **Instruction translation**
    -   Binary ↔ Hexadecimal ↔ RISC-V
-   **Developer-focused editor tools**
    -   Syntax highlighting
    -   Memory-aware line numbering
    -   Automatic mapping between input/output lines
    -   Dual text editor (input/output)
-   **Memory architecture configuration**
    -   Standard mode: 4 × 8-bit addresses per instruction
    -   Simplified mode: single 32-bit address per instruction
    -   Configurable memory size, units, and text/data segment mapping
    -   Import/export of memory configuration files
-   **Export options**
    -   Plain text (`.txt`)
    -   VHDL memory template (`.vhd`)
    -   Verilog memory template (`.v`)
-   **Testing and CI/CD**
    -   Unit tests for the assembler logic
    -   End-to-end tests (Playwright)
    -   Automated code review suggestions via CodeRabbit



## Supported Instruction Sets

**Supported** - Base RISC-V instruction types: **R, I, B, U, J** -
**M-extension** (multiplication & division)

**Not supported** - Pseudoinstructions\
- Additional RISC-V extensions\
- Custom or nonstandard instructions



## Project Structure

    /RISCV-ASSEMBLER/          → Project root
    │
    ├── public/                → Static assets
    │
    ├── src/                   → Angular application
    │   ├── app/
    │   │   ├── assembler/     → Encoding/decoding engine
    │   │   │   ├── encoders/              → Instruction encoders
    │   │   │   ├── tests/                 → Unit tests
    │   │   │   ├── instruction-tables.ts  → Opcode/funct tables
    │   │   │   ├── translator.ts          → Main translator logic
    │   │   │   ├── utils.ts               → Helper utilities
    │   │   │
    │   │   ├── export-window/             → Export UI & logic
    │   │   ├── memory-size-editor/        → Memory configuration UI
    │   │   ├── text-editor/               → Input/output editors
    │   │   ├── app.html
    │   │   └── app.ts
    │   │
    │   ├── index.html
    │   ├── main.ts
    │   └── styles.css
    │
    ├── tests-e2e/              → Playwright tests
    │   ├── tests/
    │   └── playwright.config.ts
    │
    ├── README.md
    └── LICENSE



## Development Setup

This project is built with **Angular 20**.

To run locally:

``` bash
git clone https://github.com/NestorOtzx/RISCV-ASSEMBLER.git
cd RISCV-ASSEMBLER/RISCV-ASSEMBLER
npm install
ng serve
```

Then open:

    http://localhost:4200/



## Contributing

Contributions are welcome through **Fork + Pull Request**.

All PRs must pass:

-   Unit tests
-   End-to-end tests
-   CodeRabbit automated review
-   Manual reviewer approval

## License

This project is released under the **MIT License**.
See the `LICENSE` file for details.


## Credits

Developed by **Nestor Mauricio Ortiz Montenegro**
