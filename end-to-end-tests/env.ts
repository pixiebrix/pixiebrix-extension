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

import { loadEnv } from "../scripts/env";

process.env.ENV_FILE ??= ".env.development";
loadEnv();

const requiredEnvVariables = [
  "SERVICE_URL",
  "E2E_TEST_USER_EMAIL_UNAFFILIATED",
  "E2E_TEST_USER_PASSWORD_UNAFFILIATED",
  "SHADOW_DOM",
] as const;

// It's not strictly required for the test run itself, but the extension manifest.json must have been built with
// "REQUIRE_OPTIONAL_PERMISSIONS_IN_MANIFEST" defined to avoid test failures due to missing permissions when activating certain mods.
const optionalEnvVariables = [
  "CI",
  "SLOWMO",
  "PWDEBUG",
  "REQUIRE_OPTIONAL_PERMISSIONS_IN_MANIFEST",
] as const;

type RequiredEnvVariables = Record<
  (typeof requiredEnvVariables)[number],
  string
>;
type OptionalEnvVariables = Record<
  (typeof optionalEnvVariables)[number],
  string | undefined
>;

export const assertRequiredEnvVariables = () => {
  for (const key of requiredEnvVariables) {
    // eslint-disable-next-line security/detect-object-injection -- key is a constant
    if (process.env[key] === undefined) {
      throw new Error(
        `Required environment variable is not configured: ${key}`,
      );
    }

    // eslint-disable-next-line security/detect-object-injection -- key is a constant
    if (typeof process.env[key] !== "string") {
      // For the time being we expect all of our requiredEnvVariables to be strings
      throw new TypeError(
        `Required environment variable is not configured: ${key}`,
      );
    }
  }
};

export const {
  SERVICE_URL,
  E2E_TEST_USER_EMAIL_UNAFFILIATED,
  E2E_TEST_USER_PASSWORD_UNAFFILIATED,
} = process.env as RequiredEnvVariables;

export const { CI, SLOWMO, PWDEBUG } = process.env as OptionalEnvVariables;
