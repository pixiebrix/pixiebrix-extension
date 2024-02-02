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

import { config } from "dotenv";

function parseEnv(value) {
  switch (String(value).toLowerCase()) {
    case "undefined": {
      return;
    }

    case "null": {
      return null;
    }

    case "false": {
      return false;
    }

    case "true": {
      return true;
    }

    case "": {
      return "";
    }

    default:
  }

  return Number.isNaN(Number(value)) ? value : Number(value);
}

function loadEnv() {
  // Default ENVs used by webpack
  // Note: Default ENVs used by the extension itself should be set in EnvironmentPlugin
  const defaults = {
    DEV_NOTIFY: "true",
    DEV_SLIM: "false",
    DEV_REDUX_LOGGER: "true",
    CHROME_EXTENSION_ID: "mpjjildhmpddojocokjkgmlkkkfjnepo",

    // PixieBrix URL to enable connection to for credential exchange
    SERVICE_URL: "https://app.pixiebrix.com",
    MARKETPLACE_URL: "https://www.pixiebrix.com/marketplace/",
  };

  config({
    path: process.env.ENV_FILE ?? ".env",
  });

  for (const [env, defaultValue] of Object.entries(defaults)) {
    if (!process.env[env] || parseEnv(process.env[env]) == null) {
      process.env[env] = defaultValue;
    }
  }
}

export { loadEnv, parseEnv };
