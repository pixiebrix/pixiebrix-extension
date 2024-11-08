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
import deactivateModInstancesAndSaveState from "./utils/deactivateModInstancesAndSaveState";
import { type Team } from "../data/model/Team";
import { getTeams } from "../data/service/backgroundApi";
import { getEditorState } from "../store/editorStorage";
import { getModComponentState } from "../store/modComponents/modComponentStorage";
import { getScopeAndId } from "../utils/registryUtils";
import { selectModInstances } from "../store/modComponents/modInstanceSelectors";
import type { ModInstance } from "@/types/modInstanceTypes";

async function getTeamsWithTrials() {
  const teams = await getTeams();
  return teams.filter((x) => x.trialEndTimestamp != null);
}

function getManuallyActivatedTeamModInstances(
  modInstances: ModInstance[],
  teamsWithTrials: Team[],
) {
  const teamScopes = teamsWithTrials.map((x) => x.scope);
  return modInstances.filter((x) => {
    if (x.deploymentMetadata != null) {
      return false;
    }

    const { scope } = getScopeAndId(x.definition.metadata.id);
    return Boolean(scope && teamScopes.includes(scope));
  });
}

async function syncActivatedModComponents() {
  const [modComponentState, editorState] = await Promise.all([
    getModComponentState(),
    getEditorState(),
  ]);

  const modInstances = selectModInstances({
    options: modComponentState,
  });

  if (modInstances.length === 0) {
    return;
  }

  const teamsWithTrials = await getTeamsWithTrials();

  if (teamsWithTrials.length === 0) {
    return;
  }

  const manuallyActivatedTeamModInstances =
    getManuallyActivatedTeamModInstances(modInstances, teamsWithTrials);

  if (manuallyActivatedTeamModInstances.length === 0) {
    return;
  }

  await deactivateModInstancesAndSaveState(manuallyActivatedTeamModInstances, {
    modComponentState,
    editorState,
  });
}

// Update interval for the team trial updater: 5 minutes
const UPDATE_INTERVAL_MS = 5 * 60 * 1000;

function initTeamTrialUpdater(): void {
  setInterval(syncActivatedModComponents, UPDATE_INTERVAL_MS);
  void syncActivatedModComponents();
}

export default initTeamTrialUpdater;
