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

import { integrationConfigLocator } from "@/background/messenger/api";
import extensionsSlice from "@/store/extensionsSlice";
import { Events } from "@/telemetry/events";
import reportEvent from "@/telemetry/reportEvent";
import { type ModComponentBase } from "@/types/modComponentTypes";
import { mergeDeploymentIntegrationDependencies } from "@/utils/deploymentUtils";
import { type Dispatch } from "@reduxjs/toolkit";
import type { ActivatableDeployment } from "@/types/deploymentTypes";
import {
  queueReloadModEveryTab,
  reloadModsEveryTab,
} from "@/contentScript/messenger/api";
import { persistor } from "@/extensionConsole/store/optionsStore";

const { actions } = extensionsSlice;

// For ensuring the mod state is persisted before continuing so the content script can immediately pick up the changes
async function flushAndPersist(mode: "queue" | "immediate") {
  await persistor.flush();
  if (mode === "immediate") {
    reloadModsEveryTab();
  } else {
    queueReloadModEveryTab();
  }
}

async function activateDeployment({
  dispatch,
  activatableDeployment,
  activatedModComponents,
}: {
  dispatch: Dispatch;
  activatableDeployment: ActivatableDeployment;
  activatedModComponents: ModComponentBase[];
}): Promise<void> {
  const { deployment, modDefinition } = activatableDeployment;
  let isReactivate = false;

  // Clear existing activated mod deployments
  for (const modComponent of activatedModComponents) {
    if (
      modComponent._deployment?.id === deployment.id ||
      modComponent._recipe?.id === deployment.package.package_id
    ) {
      dispatch(
        actions.removeModComponent({
          modComponentId: modComponent.id,
        }),
      );

      isReactivate = true;
    }
  }

  // Activate the mod with service definition
  dispatch(
    actions.activateMod({
      modDefinition,
      deployment,
      configuredDependencies: await mergeDeploymentIntegrationDependencies(
        activatableDeployment,
        integrationConfigLocator.findAllSanitizedConfigsForIntegration,
      ),
      // Assume validation on the backend for options
      optionsArgs: deployment.options_config,
      screen: "extensionConsole",
      isReactivate,
    }),
  );

  reportEvent(Events.DEPLOYMENT_ACTIVATE, {
    deployment: deployment.id,
  });
}

export async function activateDeployments({
  dispatch,
  activatableDeployments,
  activatedModComponents,
  reloadMode,
}: {
  dispatch: Dispatch;
  activatableDeployments: ActivatableDeployment[];
  activatedModComponents: ModComponentBase[];
  reloadMode: "queue" | "immediate";
}): Promise<void> {
  // Activate as many as we can
  const errors = [];

  for (const activatableDeployment of activatableDeployments) {
    try {
      // eslint-disable-next-line no-await-in-loop -- modifies redux state
      await activateDeployment({
        dispatch,
        activatableDeployment,
        activatedModComponents,
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

  // Ensure the mod state is persisted before continuing so the content script can immediately pick up the changes
  // when activating a deployment from the extension console. See: https://github.com/pixiebrix/pixiebrix-extension/issues/8744
  await flushAndPersist(reloadMode);
}

export function deactivateUnassignedModComponents({
  dispatch,
  unassignedModComponents,
}: {
  dispatch: Dispatch;
  unassignedModComponents: ModComponentBase[];
}) {
  const deactivatedModComponents = [];

  for (const modComponent of unassignedModComponents) {
    try {
      dispatch(
        actions.removeModComponent({
          modComponentId: modComponent.id,
        }),
      );
      deactivatedModComponents.push(modComponent);
    } catch (error) {
      reportError(
        new Error("Error deactivating unassigned mod component", {
          cause: error,
        }),
      );
    }
  }

  void flushAndPersist("immediate");

  reportEvent(Events.DEPLOYMENT_DEACTIVATE_UNASSIGNED, {
    auto: true,
    deployments: deactivatedModComponents.map(
      (modComponent) => modComponent._deployment?.id,
    ),
  });
}
