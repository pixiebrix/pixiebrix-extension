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
import { partial } from "lodash";
import { type BlockOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import { COMMON_PROPERTIES } from "@/contrib/automationanywhere/RunBot";
import { type Schema } from "@/types/schemaTypes";
import { useField } from "formik";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import RemoteSelectWidget from "@/components/form/widgets/RemoteSelectWidget";
import RequireIntegrationConfig from "@/integrations/components/RequireIntegrationConfig";
import {
  cachedFetchDevicePools,
  cachedFetchDevices,
  cachedFetchRunAsUsers,
  cachedSearchBots,
} from "@/contrib/automationanywhere/aaApi";
import { type WorkspaceType } from "./contract";
import { isCommunityControlRoom } from "@/contrib/automationanywhere/aaUtils";
import BooleanWidget from "@/components/fields/schemaFields/widgets/BooleanWidget";
import RemoteMultiSelectWidget from "@/components/form/widgets/RemoteMultiSelectWidget";
import { Alert } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import AsyncRemoteSelectWidget from "@/components/form/widgets/AsyncRemoteSelectWidget";
import { joinName } from "@/utils/formUtils";
import type { SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import RemoteFileInputArguments from "@/contrib/automationanywhere/RemoteFileInputArguments";
import useWorkspaceTypeOptionsFactoryArgs from "@/contrib/automationanywhere/useWorkspaceTypeOptionsFactoryArgs";
import WorkspaceTypeField from "@/contrib/automationanywhere/WorkspaceTypeField";
import FolderIdConfigAlert from "@/contrib/automationanywhere/FolderIdConfigAlert";
import AwaitResultField from "@/contrib/automationanywhere/AwaitResultField";

const BotLoadingMessage: React.FC = () => <span>Searching bots...</span>;
const BotNoOptionsMessage: React.FC = () => (
  <span>No bots found for query...</span>
);

const BotOptionsContent: React.FunctionComponent<{
  configName: (...keys: string[]) => string;
  sanitizedConfig: SanitizedIntegrationConfig;
}> = ({ configName, sanitizedConfig: controlRoomConfig }) => {
  const workspaceTypeFieldName = configName("workspaceType");
  const [{ value: workspaceTypeFieldValue }] = useField<WorkspaceType | null>(
    workspaceTypeFieldName,
  );
  const fileIdFieldName = configName("fileId");
  const [{ value: isAttended = false }] = useField<boolean>(
    configName("isAttended"),
  );

  // Additional args passed to the remote options factories
  const botSelectFactoryArgs = useWorkspaceTypeOptionsFactoryArgs({
    workspaceTypeFieldName,
    fileIdFieldName,
    controlRoomConfig,
  });

  return (
    <>
      <WorkspaceTypeField
        workspaceTypeFieldName={workspaceTypeFieldName}
        controlRoomConfig={controlRoomConfig}
      />

      <FolderIdConfigAlert controlRoomConfig={controlRoomConfig} />

      {
        // Use AsyncRemoteSelectWidget instead of RemoteSelectWidget because the former can handle
        // Control Rooms with lots of bots by passing in a search query to the api calls
        // https://github.com/pixiebrix/pixiebrix-extension/issues/5260
        <ConnectedFieldTemplate
          label="Bot"
          name={configName("fileId")}
          description="The Automation Anywhere bot to run"
          as={AsyncRemoteSelectWidget}
          defaultOptions
          // Refresh results when the integration config or workspace type changes
          cacheOptions={`${controlRoomConfig.id}-${workspaceTypeFieldValue}`}
          optionsFactory={cachedSearchBots}
          loadingMessage={BotLoadingMessage}
          noOptonsMessage={BotNoOptionsMessage}
          factoryArgs={botSelectFactoryArgs}
          config={controlRoomConfig}
          isClearable
          placeholder={"Type to search Bots..."}
          // Due to quirks with the memoization inside react-select, we need
          // to force this to re-render when the integration config or the
          // workspace fields change in order to force a fetch of new options
          // from the api.
          // See: https://github.com/JedWatson/react-select/issues/1581
          key={`${controlRoomConfig.id}-${workspaceTypeFieldValue}`}
        />
      }

      {isCommunityControlRoom(controlRoomConfig.config.controlRoomUrl) ? (
        <ConnectedFieldTemplate
          label="Device"
          name={configName("deviceId")}
          description="The device to run the bot on"
          as={RemoteSelectWidget}
          optionsFactory={cachedFetchDevices}
          factoryArgs={botSelectFactoryArgs}
          config={controlRoomConfig}
        />
      ) : (
        <>
          {workspaceTypeFieldValue === "public" && (
            <>
              {isAttended && (
                <Alert variant="info">
                  <FontAwesomeIcon icon={faInfoCircle} /> In attended mode, the
                  bot will run using the authenticated user&apos;s credentials.
                  You will not be able to run the bot using a Bot Creator
                  license. Switch to unattended mode to test using a Bot Creator
                  license.
                </Alert>
              )}
              <ConnectedFieldTemplate
                label="Attended"
                name={configName("isAttended")}
                description="Run the bot in attended mode, using the authenticated user's device. Requires an Attended Bot license"
                as={BooleanWidget}
              />
              {!isAttended && (
                <>
                  <ConnectedFieldTemplate
                    label="Run as Users"
                    name={configName("runAsUserIds")}
                    description="The user(s) to run the bots"
                    as={RemoteMultiSelectWidget}
                    optionsFactory={cachedFetchRunAsUsers}
                    factoryArgs={botSelectFactoryArgs}
                    blankValue={[]}
                    config={controlRoomConfig}
                  />
                  <ConnectedFieldTemplate
                    label="Device Pools"
                    name={configName("poolIds")}
                    description="A device pool that has at least one active device (optional)"
                    as={RemoteMultiSelectWidget}
                    optionsFactory={cachedFetchDevicePools}
                    factoryArgs={botSelectFactoryArgs}
                    blankValue={[]}
                    config={controlRoomConfig}
                  />
                </>
              )}
            </>
          )}

          <AwaitResultField
            awaitResultFieldName={configName("awaitResult")}
            maxWaitMillisFieldName={configName("maxWaitMillis")}
          />
        </>
      )}

      <RemoteFileInputArguments
        fileIdFieldName={fileIdFieldName}
        inputDataFieldName={configName("data")}
        controlRoomConfig={controlRoomConfig}
      />
    </>
  );
};

const BotOptions: React.FC<BlockOptionProps> = ({ name, configKey }) => {
  const configName = partial(joinName, name, configKey);
  return (
    <RequireIntegrationConfig
      integrationsSchema={COMMON_PROPERTIES.service as Schema}
      integrationsFieldName={configName("service")}
    >
      {({ sanitizedConfig }) => (
        <BotOptionsContent
          configName={configName}
          sanitizedConfig={sanitizedConfig}
        />
      )}
    </RequireIntegrationConfig>
  );
};

export default BotOptions;
