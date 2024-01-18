/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

const config = {
  silent: true,
  testEnvironment: "./src/testUtils/FixJsdomEnvironment.js",
  modulePaths: ["/src"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "yaml", "yml", "json"],
  testPathIgnorePatterns: ["<rootDir>/selenium/"],
  modulePathIgnorePatterns: ["<rootDir>/headers.json"],
  transform: {
    "^.+\\.[jt]sx?$": "@swc/jest",
    "^.+\\.mjs$": "@swc/jest",
    "^.+\\.ya?ml$": "yaml-jest-transform",
    "^.+\\.ya?ml\\?loadAsText$":
      "<rootDir>/src/testUtils/rawJestTransformer.mjs",
    "^.+\\.txt$": "<rootDir>/src/testUtils/rawJestTransformer.mjs",
  },
  transformIgnorePatterns: [
    "node_modules/(?!@cfworker|escape-string-regex|filename-reserved-regex|filenamify|idb|webext-|p-timeout|p-retry|p-defer|p-memoize|serialize-error|strip-outer|trim-repeated|mimic-fn|urlpattern-polyfill|url-join|uuid|nanoid|use-debounce|copy-text-to-clipboard|linkify-urls|create-html-element|stringify-attributes|escape-goat|stemmer|uint8array-extras|one-event|abort-utils|@rjsf)",
  ],
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
