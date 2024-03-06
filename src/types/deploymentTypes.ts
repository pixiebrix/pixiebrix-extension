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

import type { ModDefinition } from "@/types/modDefinitionTypes";
import type { Deployment } from "@/types/contract";

/**
 * A deployment and its associated mod definition (for exact package and version).
 *
 * Introduced in 1.8.10 to support dropping the mod definition from the Deployment heartbeat payload returned from
 * the server.
 *
 * @since 1.8.10
 */
export type DeploymentModDefinitionPair = {
  deployment: Deployment;
  modDefinition: ModDefinition;
};
