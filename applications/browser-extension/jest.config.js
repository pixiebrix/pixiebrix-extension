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
  "lodash-es",
  "mimic-fn",
  "nanoid",
  "one-event",
  "p-defer",
  "p-memoize",
  "p-retry",
  "p-timeout",
  "proper-event",
  "react-base16-styling",
  "react-json-tree",
  "serialize-error",
  "stemmer",
  "stringify-attributes",
  "strip-outer",
  "text-field-edit",
  "trim-repeated",
  "uint8array-extras",
  "urlpattern-polyfill",
  "use-debounce",
  "uuid",
  "webext-",
];
const config = {
  silent: true,
  // Uncomment to run tests serially, which can be useful for debugging or avoiding flaky tests.
  // maxWorkers: 1,
  testEnvironment: "./src/testUtils/FixJsdomEnvironment.js",
  modulePaths: ["/src"],
  moduleFileExtensions: [
    "ts",
    "tsx",
    "js",
    "jsx",
    "mjs",
    "yaml",
    "yml",
    "json",
  ],
  modulePathIgnorePatterns: ["<rootDir>/headers.json", "<rootDir>/dist/"],
  testPathIgnorePatterns: ["/end-to-end-tests"],
  transform: {
    "\\.[jt]sx?$": "@swc/jest",
    "\\.mjs$": "@swc/jest",
    "\\.ya?ml$": "yaml-jest-transform",
    "\\.txt$": "<rootDir>/src/testUtils/rawJestTransformer.mjs",
    // Note: `?param` URLs aren't supported here: https://github.com/jestjs/jest/pull/6282
    // You can only use a mock via `moduleNameMapper` for these.
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
    "<rootDir>/src/testUtils/injectPlatform.ts",
    "<rootDir>/src/testUtils/extendedExpectations.ts",
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
    "^@contrib/([^?]+)": "<rootDir>/contrib/$1",
    "^@schemas/([^?]+)": "<rootDir>/schemas/$1",

    "\\.s?css$": "identity-obj-proxy",
    "\\.(gif|svg|png)$": "<rootDir>/src/__mocks__/stringMock.js",

    "\\?loadAsUrl$": "<rootDir>/src/__mocks__/stringMock.js",
    "\\?loadAsText$": "<rootDir>/src/__mocks__/stringMock.js",
    "\\?loadAsComponent$": "<rootDir>/src/__mocks__/stringMock.js",

    // Auto-mocks. See documentation in ./src/__mocks__/readme.md
    "^@/(.*)$": ["<rootDir>/src/__mocks__/@/$1", "<rootDir>/src/$1"],
  },
};

module.exports = config;
