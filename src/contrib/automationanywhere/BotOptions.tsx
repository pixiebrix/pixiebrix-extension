/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import React, { useMemo } from "react";
import { isEmpty, partial } from "lodash";
import { type BlockOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import {
  COMMON_PROPERTIES,
  ENTERPRISE_EDITION_COMMON_PROPERTIES,
} from "@/contrib/automationanywhere/RunBot";
import { type Schema } from "@/types/schemaTypes";
import { useField } from "formik";
import useSanitizedIntegrationConfigFormikAdapter from "@/services/useSanitizedIntegrationConfigFormikAdapter";
import ChildObjectField from "@/components/fields/schemaFields/ChildObjectField";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import RemoteSelectWidget from "@/components/form/widgets/RemoteSelectWidget";
import RequireIntegrationConfig from "@/contrib/RequireIntegrationConfig";
import {
  cachedFetchBotFile,
  cachedSearchBots,
  cachedFetchDevicePools,
  cachedFetchDevices,
  cachedFetchFolder,
  cachedFetchRunAsUsers,
  cachedFetchSchema,
} from "@/contrib/automationanywhere/aaApi";
import { type WorkspaceType } from "./contract";
import { isCommunityControlRoom } from "@/contrib/automationanywhere/aaUtils";
import BooleanWidget from "@/components/fields/schemaFields/widgets/BooleanWidget";
import RemoteMultiSelectWidget from "@/components/form/widgets/RemoteMultiSelectWidget";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import { useAsyncEffect } from "use-async-effect";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { Alert } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import AsyncRemoteSelectWidget from "@/components/form/widgets/AsyncRemoteSelectWidget";
import { joinName } from "@/utils/formUtils";
import useAsyncState from "@/hooks/useAsyncState";
import { CONTROL_ROOM_TOKEN_INTEGRATION_ID } from "@/services/constants";

const WORKSPACE_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private/Local" },
];

const BotLoadingMessage: React.FC = () => <span>Searching bots...</span>;
const BotNoOptionsMessage: React.FC = () => (
  <span>No bots found for query...</span>
);

const BotOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
  configKey,
}) => {
  const configName = partial(joinName, name, configKey);

  // FIXME: Should this be using the same integration field schema as the
  //        RequireIntegrationConfig gate below? In other words, should BotOptions
  //        be split into two components and have the logic here moved under
  //        RequireIntegrationConfig instead of calling this hook outside the
  //        gate as well as inside it?
  const { data: controlRoomConfig } =
    useSanitizedIntegrationConfigFormikAdapter(
      CONTROL_ROOM_TOKEN_INTEGRATION_ID
    );

  const [{ value: workspaceType }, , { setValue: setWorkspaceType }] =
    useField<string>(configName("workspaceType"));

  const [{ value: fileId }] = useField<string>(configName("fileId"));

  const [{ value: isAttended = false }] = useField<boolean>(
    configName("isAttended")
  );

  const [{ value: awaitResult }] = useField<boolean | null>(
    configName("awaitResult")
  );

  // Default the workspaceType based on the file id
  useAsyncEffect(
    async (isMounted) => {
      if (!controlRoomConfig) {
        return;
      }

      if (isCommunityControlRoom(controlRoomConfig.config.controlRoomUrl)) {
        // In community edition, each user just works in their own private workspace
        await setWorkspaceType("private");
        return;
      }

      // `workspaceType` is optional because it's not required to run the bot. However, we need it to populate dropdowns
      // for the fields in the fieldset
      if (workspaceType == null && fileId) {
        const result = await cachedFetchBotFile(controlRoomConfig, fileId);
        const workspaceType =
          result.workspaceType === "PUBLIC" ? "public" : "private";
        if (isMounted()) {
          await setWorkspaceType(workspaceType);
        }
      }
    },
    // Leave setWorkspaceType off the dependency list because Formik changes reference on each render
    [controlRoomConfig, fileId, workspaceType]
  );

  const remoteSchemaState = useAsyncState(async () => {
    if (controlRoomConfig && fileId) {
      return cachedFetchSchema(controlRoomConfig, fileId);
    }

    return null;
  }, [controlRoomConfig, fileId]);

  // Don't care about pending/error state b/c we just fall back to displaying the folderId
  const { data: folder } = useAsyncState(async () => {
    if (controlRoomConfig?.config.folderId) {
      return cachedFetchFolder(
        controlRoomConfig,
        controlRoomConfig.config.folderId
      );
    }

    return null;
  }, [controlRoomConfig]);

  // Additional args passed to the remote options factories
  const factoryArgs = useMemo(
    () => ({
      // Default to "private" because that's compatible with both CE and EE
      // The workspaceType can be temporarily null when switching between CR configurations
      workspaceType: (workspaceType as WorkspaceType) ?? "private",
    }),
    [workspaceType]
  );

  return (
    <RequireIntegrationConfig
      integrationsSchema={COMMON_PROPERTIES.service as Schema}
      integrationsFieldName={configName("service")}
    >
      {({ sanitizedConfig }) => (
        <>
          {!isCommunityControlRoom(sanitizedConfig.config.controlRoomUrl) && (
            <ConnectedFieldTemplate
              label="Workspace"
              name={configName("workspaceType")}
              description="The Control Room Workspace"
              as={SelectWidget}
              defaultValue="private"
              options={WORKSPACE_OPTIONS}
            />
          )}

          {!isEmpty(sanitizedConfig.config.folderId) && (
            <Alert variant="info">
              <FontAwesomeIcon icon={faInfoCircle} /> Displaying available bots
              from folder{" "}
              {folder?.name
                ? `'${folder.name}' (${sanitizedConfig.config.folderId})`
                : sanitizedConfig.config.folderId}{" "}
              configured on the integration. To choose from all bots in the
              workspace, remove the folder from the integration configuration.
            </Alert>
          )}

          {
            // Use AsyncRemoteSelectWidget instead of RemoteSelectWidget because the former can handle
            // Control Rooms with lots of bots
            // https://github.com/pixiebrix/pixiebrix-extension/issues/5260
            <ConnectedFieldTemplate
              label="Bot"
              name={configName("fileId")}
              description="The Automation Anywhere bot to run. Type a query to search available bots by name"
              as={AsyncRemoteSelectWidget}
              defaultOptions
              // Ensure we get current results, because there's not refresh button
              cacheOptions={false}
              optionsFactory={cachedSearchBots}
              loadingMessage={BotLoadingMessage}
              noOptonsMessage={BotNoOptionsMessage}
              factoryArgs={factoryArgs}
              config={sanitizedConfig}
            />
          }

          {isCommunityControlRoom(sanitizedConfig.config.controlRoomUrl) ? (
            <ConnectedFieldTemplate
              label="Device"
              name={configName("deviceId")}
              description="The device to run the bot on"
              as={RemoteSelectWidget}
              optionsFactory={cachedFetchDevices}
              factoryArgs={factoryArgs}
              config={sanitizedConfig}
            />
          ) : (
            <>
              {workspaceType === "public" && (
                <>
                  {isAttended && (
                    <Alert variant="info">
                      <FontAwesomeIcon icon={faInfoCircle} /> In attended mode,
                      the bot will run using the authenticated user&apos;s
                      credentials. You will not be able to run the bot using a
                      Bot Creator license. Switch to unattended mode to test
                      using a Bot Creator license.
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
                        factoryArgs={factoryArgs}
                        blankValue={[]}
                        config={sanitizedConfig}
                      />
                      <ConnectedFieldTemplate
                        label="Device Pools"
                        name={configName("poolIds")}
                        description="A device pool that has at least one active device (optional)"
                        as={RemoteMultiSelectWidget}
                        optionsFactory={cachedFetchDevicePools}
                        factoryArgs={factoryArgs}
                        blankValue={[]}
                        config={sanitizedConfig}
                      />
                    </>
                  )}
                </>
              )}
              <ConnectedFieldTemplate
                label="Await Result"
                name={configName("awaitResult")}
                description="Wait for the bot to run and return the output"
                as={BooleanWidget}
              />
              {awaitResult && (
                <SchemaField
                  label="Result Timeout (Milliseconds)"
                  name={configName("maxWaitMillis")}
                  schema={
                    ENTERPRISE_EDITION_COMMON_PROPERTIES.maxWaitMillis as Schema
                  }
                  // Mark as required so the widget defaults to showing the number entry
                  isRequired
                />
              )}
            </>
          )}

          {fileId && (
            <ChildObjectField
              heading="Input Arguments"
              name={configName("data")}
              schema={remoteSchemaState.data}
              schemaError={remoteSchemaState.error}
              schemaLoading={remoteSchemaState.isLoading}
              isRequired
            />
          )}
        </>
      )}
    </RequireIntegrationConfig>
  );
};

export default BotOptions;
