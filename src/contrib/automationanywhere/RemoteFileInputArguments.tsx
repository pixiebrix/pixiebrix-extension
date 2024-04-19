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
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import { useField } from "formik";
import useAsyncState from "@/hooks/useAsyncState";
import { cachedFetchSchema } from "@/contrib/automationanywhere/aaApi";
import RemoteSchemaObjectField from "@/components/fields/schemaFields/RemoteSchemaObjectField";

const RemoteFileInputArguments: React.FC<{
  fileIdFieldName: string;
  inputDataFieldName: string;
  controlRoomConfig: SanitizedIntegrationConfig;
}> = ({ fileIdFieldName, inputDataFieldName, controlRoomConfig }) => {
  const [{ value: fileId }] = useField<string>(fileIdFieldName);

  const remoteSchemaState = useAsyncState(async () => {
    if (fileId) {
      return cachedFetchSchema(controlRoomConfig, fileId);
    }

    return null;
  }, [controlRoomConfig, fileId]);

  if (!fileId) {
    return null;
  }

  return (
    <RemoteSchemaObjectField
      heading="Input Arguments"
      name={inputDataFieldName}
      remoteSchemaState={remoteSchemaState}
    />
  );
};

export default RemoteFileInputArguments;
