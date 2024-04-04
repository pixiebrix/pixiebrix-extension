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
import { isEmpty } from "lodash";

const { actions } = extensionsSlice;

export async function deactivateUnassignedDeployments({
  dispatch,
  assignedDeployments,
  activatedModComponents,
}: {
  dispatch: Dispatch;
  assignedDeployments: ActivatableDeployment[];
  activatedModComponents: ModComponentBase[];
}) {
  const unassignedModComponents = activatedModComponents.filter(
    (modComponent) => {
      !isEmpty(modComponent._deployment) &&
        !assignedDeployments.some(
          (deployment) =>
            deployment.deployment.id === modComponent._deployment.id,
        );
    },
  );

  if (unassignedModComponents.length > 0) {
    return;
  }

  for (const modComponent of unassignedModComponents) {
    dispatch(
      actions.removeExtension({
        extensionId: modComponent.id,
      }),
    );
  }

  reportEvent(Events.DEPLOYMENT_DEACTIVATE_UNASSIGNED, {
    auto: true,
    deployments: unassignedModComponents.map(
      (modComponent) => modComponent._deployment.id,
    ),
  });
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
        actions.removeExtension({
          extensionId: modComponent.id,
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
        services.locateAllForId,
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
}: {
  dispatch: Dispatch;
  activatableDeployments: ActivatableDeployment[];
  activatedModComponents: ModComponentBase[];
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
}
