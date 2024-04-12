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
import type { SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import { isCommunityControlRoom } from "@/contrib/automationanywhere/aaUtils";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import { WORKSPACE_OPTIONS } from "@/contrib/automationanywhere/util";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";

const WorkspaceTypeField: React.FC<{
  workspaceTypeFieldName: string;
  controlRoomConfig: SanitizedIntegrationConfig;
}> = ({ workspaceTypeFieldName, controlRoomConfig }) => {
  // In community edition, each user just works in their own private workspace,
  // so we don't need to show the workspace select field
  if (isCommunityControlRoom(controlRoomConfig.config.controlRoomUrl)) {
    return null;
  }

  return (
    <ConnectedFieldTemplate
      label="Workspace"
      name={workspaceTypeFieldName}
      description="The Control Room Workspace"
      as={SelectWidget}
      defaultValue="private"
      options={WORKSPACE_OPTIONS}
    />
  );
};

export default WorkspaceTypeField;
