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

import { omit } from "lodash";
import manifest from "../applications/browser-extension/src/manifest.json";
import { loadEnv } from "./env.mjs";
import customizeManifest from "./manifest.mjs";

loadEnv();

const cleanCustomize = (...args) => omit(customizeManifest(...args), ["key"]);

describe("customizeManifest", () => {
  describe("release builds", () => {
    test("stable", () => {
      expect(
        cleanCustomize(manifest, {
          // eslint-disable-next-line camelcase -- auto-inserted
          env: { ...process.env, npm_package_version: "1.8.13" },
          isProduction: true,
          manifestVersion: 3,
        }),
      ).toMatchSnapshot();
    });

    test("beta", () => {
      expect(
        cleanCustomize(manifest, {
          // eslint-disable-next-line camelcase -- auto-inserted
          env: { ...process.env, npm_package_version: "1.8.13" },
          isProduction: true,
          manifestVersion: 3,
          isBeta: true,
        }),
      ).toMatchSnapshot();
    });
  });

  describe("four digit versioning", () => {
    test("alpha version", () => {
      expect(
        cleanCustomize(manifest, {
          // eslint-disable-next-line camelcase -- auto-inserted
          env: { ...process.env, npm_package_version: "1.8.13-alpha.123" },
          isProduction: true,
          manifestVersion: 3,
        }),
      ).toContainEntry(["version", "1.8.13.1123"]);
    });

    test("beta version", () => {
      expect(
        cleanCustomize(manifest, {
          // eslint-disable-next-line camelcase -- auto-inserted
          env: { ...process.env, npm_package_version: "1.8.13-beta.123" },
          isProduction: true,
          manifestVersion: 3,
        }),
      ).toContainEntry(["version", "1.8.13.2123"]);
    });

    test("release version", () => {
      expect(
        cleanCustomize(manifest, {
          // eslint-disable-next-line camelcase -- auto-inserted
          env: { ...process.env, npm_package_version: "1.8.13" },
          isProduction: true,
          manifestVersion: 3,
        }),
      ).toContainEntry(["version", "1.8.13.3000"]);
    });
  });
});
