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
import type { SanitizedIntegrationConfig } from "../../integrations/integrationTypes";
import { isEmpty } from "lodash";
import { Alert } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import useAsyncState from "@/hooks/useAsyncState";
import { cachedFetchFolder } from "./aaApi";

const FolderIdConfigAlert: React.FC<{
  controlRoomConfig: SanitizedIntegrationConfig;
}> = ({ controlRoomConfig }) => {
  const folderId = controlRoomConfig.config?.folderId;
  // Don't care about pending/error state b/c we just fall back to displaying the folderId
  const { data: folder } = useAsyncState(async () => {
    if (folderId) {
      return cachedFetchFolder(controlRoomConfig, folderId);
    }

    return null;
  }, [controlRoomConfig]);

  if (isEmpty(folderId)) {
    return null;
  }

  return (
    <Alert variant="info">
      <FontAwesomeIcon icon={faInfoCircle} /> Displaying available options from
      folder {folder?.name ? `'${folder.name}' (${folderId})` : folderId}{" "}
      configured on the integration. To choose from all bots in the workspace,
      remove the folder from the integration configuration.
    </Alert>
  );
};

export default FolderIdConfigAlert;
