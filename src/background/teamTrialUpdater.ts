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
import { type Organization } from "@/data/model/Organization";
import { getTeams } from "@/data/service/backgroundApi";
import { getEditorState } from "@/store/editorStorage";
import { selectActivatedModComponents } from "@/store/modComponents/modComponentSelectors";
import { getModComponentState } from "@/store/modComponents/modComponentStorage";
import { type ActivatedModComponent } from "@/types/modComponentTypes";
import { getScopeAndId } from "@/utils/registryUtils";

async function getTeamsWithTrials() {
  const teams = await getTeams();
  return teams.filter((x) => x.trialEndTimestamp != null);
}

function getManuallyActivatedTeamModComponents(
  activatedModComponents: ActivatedModComponent[],
  teamsWithTrials: Organization[],
) {
  const teamScopes = teamsWithTrials.map((x) => x.scope);
  return activatedModComponents.filter((x) => {
    if (x._deployment != null) {
      return false;
    }

    const { scope } = getScopeAndId(x._recipe?.id);
    return Boolean(scope && teamScopes.includes(scope));
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

  const teamsWithTrials = await getTeamsWithTrials();

  if (teamsWithTrials.length === 0) {
    return;
  }

  const manuallyActivatedTeamModComponents =
    getManuallyActivatedTeamModComponents(
      activatedModComponents,
      teamsWithTrials,
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
