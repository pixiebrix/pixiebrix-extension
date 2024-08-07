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
  "E2E_TEST_USER_EMAIL_AFFILIATED",
  "E2E_TEST_USER_PASSWORD_AFFILIATED",
  "SHADOW_DOM",
] as const;

// It's not strictly required for the test run itself, but the extension manifest.json must have been built with
// "REQUIRE_OPTIONAL_PERMISSIONS_IN_MANIFEST" defined to avoid test failures due to missing permissions when activating certain mods.
const optionalEnvVariables = [
  "CI",
  "SLOWMO",
  "PWDEBUG",
  "REQUIRE_OPTIONAL_PERMISSIONS_IN_MANIFEST",
  "E2E_GOOGLE_TEST_USER_EMAIL",
  "E2E_GOOGLE_TEST_USER_PASSWORD",
  "E2E_GOOGLE_TEST_USER_OTP_KEY",
  "E2E_USE_PRE_RELEASE_CHANNELS",
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
    if (process.env[key] === undefined) {
      throw new Error(
        `Required environment variable is not configured: ${key}`,
      );
    }

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
  E2E_TEST_USER_EMAIL_AFFILIATED,
  E2E_TEST_USER_PASSWORD_AFFILIATED,
} = process.env as RequiredEnvVariables;

export const {
  CI,
  SLOWMO,
  PWDEBUG,
  E2E_GOOGLE_TEST_USER_EMAIL,
  E2E_GOOGLE_TEST_USER_PASSWORD,
  E2E_GOOGLE_TEST_USER_OTP_KEY,
  E2E_USE_PRE_RELEASE_CHANNELS,
} = process.env as OptionalEnvVariables;
