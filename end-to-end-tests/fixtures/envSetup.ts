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

import { test as base } from "@playwright/test";
import { assertRequiredEnvVariables } from "../env";

export const test = base.extend<{
  additionalRequiredEnvVariables: string[];
  expectRequiredEnvVariables: void;
}>({
  additionalRequiredEnvVariables: [],
  expectRequiredEnvVariables: [
    async ({ additionalRequiredEnvVariables }, use) => {
      assertRequiredEnvVariables();

      for (const key of additionalRequiredEnvVariables) {
        if (process.env[key] === undefined) {
          throw new Error(
            `This test requires additional environment variable ${key} to be configured. Configure it in your .env.development file and re-build the extension.`,
          );
        }
      }

      await use();
    },
    { auto: true },
  ],
});
