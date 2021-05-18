/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { ExtensionOptions, loadOptions } from "@/options/loader";
import { Deployment } from "@/types/contract";
import { browser } from "webextension-polyfill-ts";
import moment from "moment";
import { uniq, compact } from "lodash";
import { reportError } from "@/telemetry/logging";
import axios from "axios";
import { getBaseURL } from "@/services/baseService";
import { getExtensionVersion, getUID } from "@/background/telemetry";
import { getExtensionToken } from "@/auth/token";

const UPDATE_INTERVAL_MS = 10 * 60 * 1000;

async function updateDeployments() {
  const token = await getExtensionToken();

  if (!token) {
    return;
  }

  const { extensions: extensionPointConfigs } = await loadOptions();
  const extensions: ExtensionOptions[] = Object.entries(
    extensionPointConfigs
  ).flatMap(([, xs]) => Object.values(xs));

  if (extensions.some((x) => x._deployment?.id)) {
    const timestamps = new Map<string, moment.Moment>();

    for (const extension of extensions) {
      if (extension._deployment?.id) {
        timestamps.set(
          extension._deployment?.id,
          moment(extension._deployment?.timestamp)
        );
      }
    }

    const { data: deployments } = await axios.post<Deployment[]>(
      `${await getBaseURL()}/api/deployments/`,
      {
        uid: await getUID(),
        version: await getExtensionVersion(),
        active: compact(uniq(extensions.map((x) => x._deployment?.id))),
      },
      {
        headers: { Authorization: `Token ${token}` },
      }
    );

    if (
      deployments.some(
        (x: Deployment) =>
          !timestamps.has(x.id) ||
          moment(x.updated_at).isAfter(timestamps.get(x.id))
      )
    ) {
      // TODO: check if additional permissions needed. If not, refresh brick definitions, then activate
      await browser.runtime.openOptionsPage();
    } else {
      console.debug("No deployment updates found");
    }
  } else {
    console.debug("No deployments installed");
  }
}

export function initDeploymentUpdater(): void {
  setInterval(updateDeployments, UPDATE_INTERVAL_MS);
  updateDeployments().catch((err) => reportError(err));
}

export default initDeploymentUpdater;
