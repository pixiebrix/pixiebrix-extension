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

import type { Me } from "@/types/contract";
import { maybeGetLinkedApiClient } from "@/services/apiClient";
import reportError from "@/telemetry/reportError";

// TODO: we should start extracting this request pattern into an api of some
//  kind that the background script can use
async function autoModUpdatesEnabled(): Promise<boolean> {
  const client = await maybeGetLinkedApiClient();
  if (client == null) {
    console.debug(
      "Skipping automatic mod updates because the extension is not linked to the PixieBrix service"
    );
    return false;
  }

  try {
    const { data: profile } = await client.get<Me>("/api/me/");

    //  TODO: check if status code of >= 400 is caught by the try/catch

    return profile.flags.includes("automatic-mod-updates");
  } catch (error) {
    reportError(error);
    return false;
  }
}

export async function initModUpdater(): Promise<void> {
  // Check for automatic-mod-updates flag
  if (await autoModUpdatesEnabled()) {
    console.log("*** automatic mod updates enabled :)");
    return;
  }

  // if not present, return
  console.log("*** automatic mod updates not enabled");
}
