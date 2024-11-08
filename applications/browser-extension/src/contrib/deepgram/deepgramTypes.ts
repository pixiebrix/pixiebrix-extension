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

import type {
  IntegrationConfig,
  SecretsConfig,
} from "@/integrations/integrationTypes";
import { assertNotNullish, type Nullishable } from "@/utils/nullishUtils";
import { validateRegistryId } from "@/types/helpers";

export const DEEPGRAM_INTEGRATION_ID = validateRegistryId("deepgram/api");

type DeepgramConfig = SecretsConfig & {
  apiKey: string;
};

export function assertDeepgramIntegrationConfig(
  config: Nullishable<IntegrationConfig>,
): asserts config is IntegrationConfig<DeepgramConfig> {
  if (config == null) {
    throw new TypeError(`Expected ${DEEPGRAM_INTEGRATION_ID} config, got null`);
  }

  if (config.integrationId !== DEEPGRAM_INTEGRATION_ID) {
    throw new Error(
      `Expected ${DEEPGRAM_INTEGRATION_ID} integration id, got ${config.integrationId}`,
    );
  }

  assertNotNullish(
    config.config.apiKey,
    "Expected apiKey in Deepgram configuration",
  );
}
