/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { maybeGetLinkedApiClient } from "@/services/apiClient";

/**
 * Restricts access to urls specified by an organization in managed storage for users unauthenticated with PixieBrix.
 */
// TODO: call this restrictUnauthenticatedUrlAccess
async function initEnforceAuthentication(): Promise<void> {
  const client = await maybeGetLinkedApiClient();
  if (client == null) {
    console.debug(
      "Skipping enforced PixieBrix authentication check because the mod is not linked to the PixieBrix service",
    );
    return;
  }
}

export default initEnforceAuthentication;
