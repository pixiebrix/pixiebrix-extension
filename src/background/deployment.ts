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

import { ExtensionOptions, loadOptions, saveOptions } from "@/options/loader";
import { Deployment } from "@/types/contract";
import { browser, Permissions } from "webextension-polyfill-ts";
import { partition, fromPairs, uniqBy } from "lodash";
import { reportError } from "@/telemetry/logging";
import axios from "axios";
import { getBaseURL } from "@/services/baseService";
import { getExtensionVersion, getUID } from "@/background/telemetry";
import { getExtensionToken } from "@/auth/token";
import { checkPermissions, collectPermissions } from "@/permissions";
import { optionsSlice, OptionsState } from "@/options/slices";
import { reportEvent } from "@/telemetry/events";
import { selectExtensions } from "@/options/pages/InstalledPage";
import { refreshRegistries } from "@/hooks/refresh";
import { liftBackground } from "@/background/protocol";
import * as contentScript from "@/contentScript/lifecycle";

const { reducer, actions } = optionsSlice;

const UPDATE_INTERVAL_MS = 10 * 60 * 1000;

async function deploymentPermissions(
  deployment: Deployment
): Promise<Permissions.Permissions[]> {
  const blueprint = deployment.package.config;
  // Deployments can only use proxied services, so there's no additional permissions to request for the
  // the serviceAuths.
  return await collectPermissions(blueprint, []);
}

type ActiveDeployment = {
  deployment: string;
  blueprint: string;
  blueprintVersion: string;
};

export function activeDeployments(
  extensions: Pick<ExtensionOptions, "_deployment" | "_recipe">[]
): ActiveDeployment[] {
  return uniqBy(
    extensions
      .filter((x) => x._deployment?.id != null)
      .map((x) => ({
        deployment: x._deployment.id,
        blueprint: x._recipe?.id,
        blueprintVersion: x._recipe?.version,
      })),
    (x) => x.deployment
  );
}

export const queueReactivate = liftBackground(
  "QUEUE_REACTIVATE",
  async () => {
    await contentScript.queueReactivate(null);
  },
  { asyncResponse: false }
);

function installDeployment(
  state: OptionsState,
  deployment: Deployment
): OptionsState {
  let returnState = state;
  const installed = selectExtensions({ options: state });

  for (const extension of installed) {
    if (extension._recipe.id === deployment.package.package_id) {
      returnState = reducer(
        returnState,
        actions.removeExtension({
          extensionPointId: extension.extensionPointId,
          extensionId: extension.id,
        })
      );
    }
  }

  // install the blueprint with the service definition
  returnState = reducer(
    returnState,
    actions.installRecipe({
      recipe: deployment.package.config,
      extensionPoints: deployment.package.config.extensionPoints,
      services: fromPairs(
        deployment.bindings.map((x) => [x.auth.service_id, x.auth.id])
      ),
      deployment,
    })
  );

  reportEvent("DeploymentActivate", {
    deployment: deployment.id,
    auto: true,
  });

  return returnState;
}

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
    const timestamps = new Map<string, Date>();

    for (const extension of extensions) {
      if (extension._deployment?.id) {
        timestamps.set(
          extension._deployment?.id,
          new Date(extension._deployment?.timestamp)
        );
      }
    }

    const { data: deployments } = await axios.post<Deployment[]>(
      `${await getBaseURL()}/api/deployments/`,
      {
        uid: await getUID(),
        version: await getExtensionVersion(),
        active: activeDeployments(extensions),
      },
      {
        headers: { Authorization: `Token ${token}` },
      }
    );

    const updatedDeployments = deployments.filter(
      (x: Deployment) =>
        !timestamps.has(x.id) || new Date(x.updated_at) > timestamps.get(x.id)
    );

    if (updatedDeployments.length > 0) {
      try {
        // Get the current brick definitions, which will have the current permissions
        await refreshRegistries();
      } catch (err) {
        reportError(err);
        await browser.runtime.openOptionsPage();
      }

      const deploymentRequirements = await Promise.all(
        updatedDeployments.map(async (deployment) => ({
          deployment,
          hasPermissions: await checkPermissions(
            await deploymentPermissions(deployment)
          ),
        }))
      );

      const [automatic, manual] = partition(
        deploymentRequirements,
        (x) => x.hasPermissions
      );

      let automaticError = false;

      if (automatic.length > 0) {
        console.debug(
          `Applying automatic updates for ${automatic.length} deployment(s)`
        );

        try {
          let currentOptions = await loadOptions();
          for (const { deployment } of automatic) {
            // clear existing installs of the blueprint
            currentOptions = installDeployment(currentOptions, deployment);
          }
          await saveOptions(currentOptions);
          queueReactivate().catch((err) => reportError(err));
          console.info(
            `Applied automatic updates for ${automatic.length} deployment(s)`
          );
        } catch (err) {
          console.warn(err);
          reportError(err);
          automaticError = true;
        }
      }

      if (manual.length > 0 || automaticError) {
        await browser.runtime.openOptionsPage();
      }
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
