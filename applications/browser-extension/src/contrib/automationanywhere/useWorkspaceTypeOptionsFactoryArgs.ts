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

import useAsyncEffect from "use-async-effect";
import { isCommunityControlRoom } from "./aaUtils";
import { type SanitizedIntegrationConfig } from "../../integrations/integrationTypes";
import { useField } from "formik";
import type { WorkspaceType } from "./contract";
import { cachedFetchBotFile } from "./aaApi";
import { useMemo } from "react";

export type WorkspaceTypeFactoryArgs = {
  workspaceType: WorkspaceType;
};

/**
 * Handle default value logic for workspaceType, and return the extraArgs object
 * needed for the async select options factory
 * @param workspaceTypeFieldName Formik field name/path for the workspaceType field
 * @param fileIdFieldName Formik field name/path for the fileId field
 * @param controlRoomConfig The integration configuration for the control room
 *
 * @see AsyncRemoteSelectWidget
 */
function useWorkspaceTypeOptionsFactoryArgs({
  workspaceTypeFieldName,
  fileIdFieldName,
  controlRoomConfig,
}: {
  workspaceTypeFieldName: string;
  fileIdFieldName: string;
  controlRoomConfig: SanitizedIntegrationConfig;
}): WorkspaceTypeFactoryArgs {
  const [{ value: workspaceTypeFieldValue }, , { setValue: setWorkspaceType }] =
    useField<WorkspaceType | null>(workspaceTypeFieldName);
  const [{ value: fileId }] = useField<string>(fileIdFieldName);

  // If workspaceType is not set, but there is a file selected, look up the
  // file ID and set the workspaceType from the file info
  useAsyncEffect(
    async (isMounted) => {
      if (isCommunityControlRoom(controlRoomConfig.config.controlRoomUrl)) {
        // In community edition, each user just works in their own private workspace
        await setWorkspaceType("private");
        return;
      }

      if (workspaceTypeFieldValue) {
        return;
      }

      // Default the workspace type to "private" because that's compatible with both CE and EE
      if (!fileId) {
        await setWorkspaceType("private");
        return;
      }

      const { workspaceType: workspaceTypeFromBotFile } =
        await cachedFetchBotFile(controlRoomConfig, fileId);
      const workspaceTypeNewValue: WorkspaceType =
        workspaceTypeFromBotFile === "PUBLIC" ? "public" : "private";
      if (isMounted()) {
        await setWorkspaceType(workspaceTypeNewValue);
      }
    },
    [controlRoomConfig, fileId, workspaceTypeFieldValue],
  );

  return useMemo(
    () => ({
      // Default to "private" because that's compatible with both CE and EE
      // The workspaceType can be temporarily null when switching between CR configurations
      workspaceType: workspaceTypeFieldValue ?? "private",
    }),
    [workspaceTypeFieldValue],
  );
}

export default useWorkspaceTypeOptionsFactoryArgs;
