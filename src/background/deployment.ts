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
import { fetch } from "@/hooks/fetch";
import { Deployment } from "@/types/contract";
import { browser } from "webextension-polyfill-ts";
import moment from "moment";
import { reportError } from "@/telemetry/logging";

const UPDATE_INTERVAL_MS = 10 * 60 * 1000;

async function updateDeployments() {
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

    const deployments = await fetch<Deployment[]>("/api/deployments/");

    if (
      deployments.some(
        (x) =>
          !timestamps.has(x.id) ||
          moment(x.updated_at).isAfter(timestamps.get(x.id))
      )
    ) {
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
