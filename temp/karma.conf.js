
const path = require('path');

process.env.CHROME_BIN =
  process.env.CHROME_BIN ||
  'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe' ||
  require('puppeteer').executablePath();

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],

    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],

    client: {
      jasmine: {
        random: false, // desactiva orden aleatorio
      },
      clearContext: false, // deja visible el reporte en navegador
    },

    coverageReporter: {
      dir: path.join(__dirname, './coverage/riscv-assembler'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
      ],
    },

    reporters: ['progress', 'kjhtml'],

    browsers: ['BraveHeadless'],

    customLaunchers: {
      BraveHeadless: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
        binary: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      },
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
      },
    },

    singleRun: false,
    restartOnFileChange: true,
  });
};
