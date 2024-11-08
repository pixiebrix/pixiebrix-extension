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

import { maybeGetLinkedApiClient } from "../data/service/apiClient";
import { getSharingType } from "../hooks/useAuthOptions";
import { type RemoteIntegrationConfig } from "@/types/contract";
import reportError from "../telemetry/reportError";
import { API_PATHS } from "../data/service/urlPaths";

export async function getBuiltInIntegrationConfigs(): Promise<
  RemoteIntegrationConfig[]
> {
  const client = await maybeGetLinkedApiClient();
  if (client == null) {
    return [];
  }

  try {
    const { data: integrationConfigs } = await client.get<
      RemoteIntegrationConfig[]
    >(API_PATHS.INTEGRATIONS_SHARED_SANITIZED);

    return integrationConfigs.filter(
      (auth) => getSharingType(auth) === "built-in",
    );
  } catch (error) {
    reportError(error);
    return [];
  }
}
