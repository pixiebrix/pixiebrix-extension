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

import { services } from "@/background/messenger/strict/api";
import extensionsSlice from "@/store/extensionsSlice";
import { Events } from "@/telemetry/events";
import reportEvent from "@/telemetry/reportEvent";
import { type ModComponentBase } from "@/types/modComponentTypes";
import { mergeDeploymentIntegrationDependencies } from "@/utils/deploymentUtils";
import { type Dispatch } from "@reduxjs/toolkit";
import type { ActivatableDeployment } from "@/types/deploymentTypes";

const { actions } = extensionsSlice;

async function activateDeployment({
  dispatch,
  activatableDeployment,
  installed,
}: {
  dispatch: Dispatch;
  activatableDeployment: ActivatableDeployment;
  installed: ModComponentBase[];
}): Promise<void> {
  const { deployment, modDefinition } = activatableDeployment;
  let isReinstall = false;

  // Clear existing installations of the blueprint
  for (const extension of installed) {
    // Extension won't have recipe if it was locally created by a developer
    if (extension._recipe?.id === deployment.package.package_id) {
      dispatch(
        actions.removeExtension({
          extensionId: extension.id,
        }),
      );

      isReinstall = true;
    }
  }

  // Install the blueprint with the service definition
  dispatch(
    actions.activateMod({
      modDefinition,
      deployment,
      configuredDependencies: await mergeDeploymentIntegrationDependencies(
        activatableDeployment,
        services.locateAllForId,
      ),
      // Assume validation on the backend for options
      optionsArgs: deployment.options_config,
      screen: "extensionConsole",
      isReactivate: isReinstall,
    }),
  );

  reportEvent(Events.DEPLOYMENT_ACTIVATE, {
    deployment: deployment.id,
  });
}

export async function activateDeployments({
  dispatch,
  activatableDeployments,
  installed,
}: {
  dispatch: Dispatch;
  activatableDeployments: ActivatableDeployment[];
  installed: ModComponentBase[];
}): Promise<void> {
  // Activate as many as we can
  const errors = [];

  for (const activatableDeployment of activatableDeployments) {
    try {
      // eslint-disable-next-line no-await-in-loop -- modifies redux state
      await activateDeployment({
        dispatch,
        activatableDeployment,
        installed,
      });
    } catch (error) {
      errors.push(error);
    }
  }

  if (errors.length > 0) {
    // XXX: only throwing the first is OK, because the user will see the next error if they fix this error and then
    // activate deployments again
    throw errors[0];
  }
}
