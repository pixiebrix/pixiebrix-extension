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
import deactivateModComponentsAndSaveState from "@/background/utils/deactivateModComponentsAndSaveState";
import { getOrganizations } from "@/data/service/backgroundApi";
import { getEditorState } from "@/store/editorStorage";
import { selectActivatedModComponents } from "@/store/modComponents/modComponentSelectors";
import { getModComponentState } from "@/store/modComponents/modComponentStorage";
import { type ActivatedModComponent } from "@/types/modComponentTypes";
import { type components } from "@/types/swagger";
import { getScopeAndId } from "@/utils/registryUtils";

async function getOrganizationsWithTrials() {
  const organizations = await getOrganizations();
  return organizations.filter(
    (organization) => organization.trial_end_timestamp != null,
  );
}

function getManuallyActivatedTeamModComponents(
  activatedModComponents: ActivatedModComponent[],
  organizationsWithTrials: Array<components["schemas"]["Organization"]>,
) {
  const teamScopes = organizationsWithTrials.map((x) => x.scope);
  return activatedModComponents.filter((x) => {
    if (x._deployment != null) {
      return false;
    }

    const { scope } = getScopeAndId(x._recipe?.id);
    return teamScopes.includes(scope);
  });
}

async function syncActivatedModComponents() {
  const [modComponentState, editorState] = await Promise.all([
    getModComponentState(),
    getEditorState(),
  ]);

  const activatedModComponents = selectActivatedModComponents({
    options: modComponentState,
  });

  if (activatedModComponents.length === 0) {
    return;
  }

  const organizationsWithTrials = await getOrganizationsWithTrials();

  if (organizationsWithTrials.length === 0) {
    return;
  }

  const manuallyActivatedTeamModComponents =
    getManuallyActivatedTeamModComponents(
      activatedModComponents,
      organizationsWithTrials,
    );

  if (manuallyActivatedTeamModComponents.length === 0) {
    return;
  }

  await deactivateModComponentsAndSaveState(
    manuallyActivatedTeamModComponents,
    {
      modComponentState,
      editorState,
    },
  );
}

// Update interval for the team trial updater: 5 minutes
const UPDATE_INTERVAL_MS = 5 * 60 * 1000;

function initTeamTrialUpdater(): void {
  setInterval(syncActivatedModComponents, UPDATE_INTERVAL_MS);
  void syncActivatedModComponents();
}

export default initTeamTrialUpdater;
