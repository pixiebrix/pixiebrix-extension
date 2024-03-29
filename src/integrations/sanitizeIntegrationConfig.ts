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

import {
  type Integration,
  type IntegrationConfigArgs,
  type SanitizedConfig,
} from "@/integrations/integrationTypes";
import { inputProperties } from "@/utils/schemaUtils";

const REF_SECRETS = [
  "https://app.pixiebrix.com/schemas/key#",
  "https://app.pixiebrix.com/schemas/key",
];

/** Return config excluding any secrets/keys. */
export function sanitizeIntegrationConfig(
  service: Integration,
  config: IntegrationConfigArgs,
): SanitizedConfig {
  const result: SanitizedConfig = {} as SanitizedConfig;
  for (const [key, type] of Object.entries(inputProperties(service.schema))) {
    // eslint-disable-next-line security/detect-object-injection -- Safe because we're getting from Object.entries
    const value = config[key];

    if (
      typeof type !== "boolean" &&
      (!type.$ref || !REF_SECRETS.includes(type.$ref)) &&
      // Explicitly check for undefined to be safe, even though we should never see it in practice
      // because it's not valid JSON. We could just check "key in config" instead.
      value !== undefined
    ) {
      // eslint-disable-next-line security/detect-object-injection -- Safe because we're getting from Object.entries
      result[key] = value;
    }
  }

  return result;
}
