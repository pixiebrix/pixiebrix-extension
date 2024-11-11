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

import { type RegistryId } from "@/types/registryTypes";
import { validateRegistryId } from "@/types/helpers";
import type { UUID } from "@/types/stringTypes";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { type Schema } from "@/types/schemaTypes";
import { validateOutputKey } from "@/runtime/runtimeTypes";

/**
 * The PixieBrix API integration definition registry id.
 */
export const PIXIEBRIX_INTEGRATION_ID: RegistryId =
  validateRegistryId("@pixiebrix/api");
// Use a minimal valid UUID for pixiebrix to avoid null id
export const PIXIEBRIX_INTEGRATION_CONFIG_ID: UUID = uuidSequence(0);
export const PIXIEBRIX_OUTPUT_KEY = validateOutputKey("pixiebrix");
// We should probably leave this as called "SERVICES_" until if/when the actual url is changed
// to point to /schemas/integrations/, just as a reminder
export const INTEGRATIONS_BASE_SCHEMA_URL =
  "https://app.pixiebrix.com/schemas/services/";
export const PIXIEBRIX_INTEGRATION_REF_URL = `${INTEGRATIONS_BASE_SCHEMA_URL}${PIXIEBRIX_INTEGRATION_ID}`;
export const PIXIEBRIX_INTEGRATION_FIELD_SCHEMA: Schema = {
  $ref: PIXIEBRIX_INTEGRATION_REF_URL,
};
// Automation Anywhere partner service definition constants
export const CONTROL_ROOM_TOKEN_INTEGRATION_ID: RegistryId = validateRegistryId(
  "automation-anywhere/control-room",
);
export const CONTROL_ROOM_OAUTH_INTEGRATION_ID: RegistryId = validateRegistryId(
  "automation-anywhere/oauth2",
);
export const INTEGRATION_DEPENDENCY_FIELD_REFS = [
  "https://app.pixiebrix.com/schemas/service#/definitions/configuredServiceOrVar",
  "https://app.pixiebrix.com/schemas/service#/definitions/configuredService",
];
