/*
 * Copyright (C) 2024 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// These strings are used as "starts with"
const esmPackages = [
  "@cfworker/",
  "@sindresorhus/",
  "abort-utils",
  "batched-function",
  "copy-text-to-clipboard",
  "create-html-element",
  "escape-goat",
  "escape-string-regexp",
  "filename-reserved-regex",
  "filenamify",
  "idb",
  "intrinsic-scale",
  "is-network-error",
  "ky",
  "linkify-urls",
  "mimic-fn",
  "nanoid",
  "one-event",
  "p-defer",
  "p-memoize",
  "p-retry",
  "p-timeout",
  "serialize-error",
  "stemmer",
  "stringify-attributes",
  "strip-outer",
  "text-field-edit",
  "trim-repeated",
  "uint8array-extras",
  "url-join",
  "urlpattern-polyfill",
  "use-debounce",
  "uuid",
  "webext-",
];
const config = {
  silent: true,
  testEnvironment: "./src/testUtils/FixJsdomEnvironment.js",
  modulePaths: ["/src"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "yaml", "yml", "json"],
  modulePathIgnorePatterns: ["<rootDir>/headers.json", "<rootDir>/dist/"],
  testPathIgnorePatterns: ["/end-to-end-tests"],
  transform: {
    "^.+\\.[jt]sx?$": "@swc/jest",
    "^.+\\.mjs$": "@swc/jest",
    "^.+\\.ya?ml$": "yaml-jest-transform",
    "^.+\\.ya?ml\\?loadAsText$":
      "<rootDir>/src/testUtils/rawJestTransformer.mjs",
    "^.+\\.txt$": "<rootDir>/src/testUtils/rawJestTransformer.mjs",
  },
  transformIgnorePatterns: [`node_modules/(?!${esmPackages.join("|")})`],
  setupFiles: [
    "dotenv/config",
    "<rootDir>/src/testUtils/testEnv.js",
    "jest-webextension-mock",
    "fake-indexeddb/auto",
  ],
  setupFilesAfterEnv: [
    "<rootDir>/src/testUtils/testAfterEnv.ts",
    "<rootDir>/src/testUtils/injectRegistries.ts",
    "jest-extended/all",
  ],
  reporters: ["default", "github-actions"],
  coverageReporters: ["json"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.stories.tsx",
    "!**/__mocks__/**",
    "!**/node_modules/**",
    "!**/vendor/**",
  ],
  moduleNameMapper: {
    "\\.s?css$": "identity-obj-proxy",
    "\\.(gif|svg|png)$|\\?loadAsUrl$|\\?loadAsComponent$":
      "<rootDir>/src/__mocks__/stringMock.js",
    "^@contrib/(.*?)(\\?loadAsText)?$": "<rootDir>/contrib/$1",
    "^@schemas/(.*)": "<rootDir>/schemas/$1",

    // Auto-mocks. See documentation in ./src/__mocks__/readme.md
    "^@/(.*)$": ["<rootDir>/src/__mocks__/@/$1", "<rootDir>/src/$1"],
  },
};

module.exports = config;
