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

import { type IntegrationDependency } from "../integrationTypes";
import {
  PIXIEBRIX_INTEGRATION_CONFIG_ID,
  PIXIEBRIX_INTEGRATION_ID,
  PIXIEBRIX_OUTPUT_KEY,
} from "../constants";

export default function pixiebrixIntegrationDependencyFactory(): IntegrationDependency {
  return {
    integrationId: PIXIEBRIX_INTEGRATION_ID,
    outputKey: PIXIEBRIX_OUTPUT_KEY,
    isOptional: false,
    apiVersion: "v2",
    configId: PIXIEBRIX_INTEGRATION_CONFIG_ID,
  } as IntegrationDependency;
}
