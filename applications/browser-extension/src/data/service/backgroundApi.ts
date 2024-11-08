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

import { memoizeUntilSettled } from "@/utils/promiseUtils";
import { getApiClient } from "@/data/service/apiClient";
import type { components } from "@/types/swagger";
import { expectContext } from "@/utils/expectContext";
import { API_PATHS } from "@/data/service/urlPaths";
import { transformTeamResponse, type Team } from "@/data/model/Team";

// Safe to memoize in-memory because the background page/worker is reloaded when the authenticated user changes.
// When the user changes, the background page/worker is reloaded, the memoizeUntilSettled cache is cleared so the
// next call to fetchFeatureFlagsInBackground will fetch the using the new user's credentials.
export const getMe = memoizeUntilSettled(
  async (): Promise<components["schemas"]["Me"]> => {
    expectContext("background");
    const client = await getApiClient();
    // Safe to call with non-authenticated client
    // NOTE: currently includes flags, in the future we may want to separate flags into a separate endpoint
    const { data } = await client.get<components["schemas"]["Me"]>(
      API_PATHS.ME,
    );
    return data;
  },
);

export const getTeams = memoizeUntilSettled(async (): Promise<Team[]> => {
  expectContext("background");
  const client = await getApiClient();
  const { data } = await client.get<
    Array<components["schemas"]["Organization"]>
  >(API_PATHS.ORGANIZATIONS);
  return transformTeamResponse(data);
});
