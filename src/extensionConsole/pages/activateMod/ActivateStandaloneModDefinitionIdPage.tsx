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

import React from "react";
import { useParams } from "react-router";
import { useGetStandaloneModDefinitionQuery } from "@/data/service/api";
import { type UUID } from "@/types/stringTypes";
import useMergeAsyncState from "@/hooks/useMergeAsyncState";
import { type StandaloneModDefinition } from "@/types/contract";
import ActivateModDefinitionPage from "@/extensionConsole/pages/activateMod/ActivateModDefinitionPage";
import { mapStandaloneModDefinitionToModDefinition } from "@/mods/utils/mapStandaloneModDefinitionToModDefinition";

/**
 * Page for activating a standalone mod definition stored on the server by id.
 *
 * As of 2.0.6, converts to a mod definition for activation.
 */
const ActivateStandaloneModDefinitionIdPage: React.FunctionComponent = () => {
  const { modComponentId } = useParams<{ modComponentId: UUID }>();

  const standaloneModDefinitionQuery = useGetStandaloneModDefinitionQuery(
    { modComponentId },
    {
      // Force-refetch the latest data for mod definition before activation. (Because the user might
      // have already had the Extension Console open when the mod was updated.)
      refetchOnMountOrArgChange: true,
    },
  );

  const modDefinitionQuery = useMergeAsyncState(
    standaloneModDefinitionQuery,
    (standaloneModDefinition: StandaloneModDefinition) =>
      mapStandaloneModDefinitionToModDefinition(standaloneModDefinition),
  );

  return (
    <ActivateModDefinitionPage
      modDefinitionQuery={modDefinitionQuery}
      forceModComponentId={modComponentId}
    />
  );
};

export default ActivateStandaloneModDefinitionIdPage;
