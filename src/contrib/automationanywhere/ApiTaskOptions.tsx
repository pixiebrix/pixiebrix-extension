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

import React, { useMemo } from "react";
import { type BlockOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import { isEmpty, partial } from "lodash";
import { joinName } from "@/utils/formUtils";
import RequireIntegrationConfig from "@/integrations/components/RequireIntegrationConfig";
import { RUN_API_TASK_INPUT_SCHEMA } from "@/contrib/automationanywhere/RunApiTask";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import { type Schema } from "@/types/schemaTypes";
import { useField } from "formik";
import { useAsyncEffect } from "use-async-effect";
import {
  cachedFetchBotFile,
  cachedFetchFolder,
  cachedFetchSchema,
  cachedSearchApiTasks,
} from "@/contrib/automationanywhere/aaApi";
import useAsyncState from "@/hooks/useAsyncState";
import { type WorkspaceType } from "@/contrib/automationanywhere/contract";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import { WORKSPACE_OPTIONS } from "@/contrib/automationanywhere/util";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { Alert } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import AsyncRemoteSelectWidget from "@/components/form/widgets/AsyncRemoteSelectWidget";
import BooleanWidget from "@/components/fields/schemaFields/widgets/BooleanWidget";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import ChildObjectField from "@/components/fields/schemaFields/ChildObjectField";

const TasksLoadingMessage: React.FC = () => <span>Searching tasks...</span>;
const TasksNoOptionsMessage: React.FC = () => <span>No tasks found</span>;

const ApiTaskOptionsContent: React.FC<{
  configName: (...keys: string[]) => string;
  sanitizedConfig: SanitizedIntegrationConfig;
}> = ({ configName, sanitizedConfig: controlRoomConfig }) => {
  const [{ value: workspaceTypeFieldValue }, , { setValue: setWorkspaceType }] =
    useField<WorkspaceType | null>(configName("workspaceType"));
  const [{ value: botId }] = useField<string>(configName("botId"));
  const [{ value: awaitResult }] = useField<boolean>(configName("awaitResult"));

  // If workspaceType is not set, but there is a task selected, look up the
  // file ID and set the workspaceType from the file info
  useAsyncEffect(
    async (isMounted) => {
      if (workspaceTypeFieldValue || !botId) {
        return;
      }

      const { workspaceType: workspaceTypeFromBotFile } =
        await cachedFetchBotFile(controlRoomConfig, botId);
      const workspaceTypeNewValue: WorkspaceType =
        workspaceTypeFromBotFile === "PUBLIC" ? "public" : "private";
      if (isMounted()) {
        await setWorkspaceType(workspaceTypeNewValue);
      }
    },
    [controlRoomConfig, botId, workspaceTypeFieldValue],
  );

  const remoteSchemaState = useAsyncState(async () => {
    if (botId) {
      return cachedFetchSchema(controlRoomConfig, botId);
    }

    return null;
  }, [controlRoomConfig, botId]);

  // Don't care about pending/error state b/c we just fall back to displaying the folderId
  const { data: folder } = useAsyncState(async () => {
    const folderId = controlRoomConfig.config?.folderId;
    if (folderId) {
      return cachedFetchFolder(controlRoomConfig, folderId);
    }

    return null;
  }, [controlRoomConfig]);

  // Additional args passed to the remote options factories
  const factoryArgs = useMemo(
    () => ({
      // Default to "private" because that's compatible with both CE and EE
      // The workspaceType can be temporarily null when switching between CR configurations
      workspaceType: workspaceTypeFieldValue ?? "private",
    }),
    [workspaceTypeFieldValue],
  );

  return (
    <>
      <ConnectedFieldTemplate
        label="Workspace"
        name={configName("workspaceType")}
        description="The Control Room Workspace"
        as={SelectWidget}
        defaultValue="private"
        options={WORKSPACE_OPTIONS}
      />

      {!isEmpty(controlRoomConfig.config.folderId) && (
        <Alert variant="info">
          <FontAwesomeIcon icon={faInfoCircle} /> Displaying available bots from
          folder{" "}
          {folder?.name
            ? `'${folder.name}' (${controlRoomConfig.config.folderId})`
            : controlRoomConfig.config.folderId}{" "}
          configured on the integration. To choose from all bots in the
          workspace, remove the folder from the integration configuration.
        </Alert>
      )}

      {
        // Use AsyncRemoteSelectWidget instead of RemoteSelectWidget because the former can handle
        // Control Rooms with lots of bots
        // https://github.com/pixiebrix/pixiebrix-extension/issues/5260
        <ConnectedFieldTemplate
          label="API Task"
          name={configName("botId")}
          description="The Automation Anywhere API Task to run. Type a query to search available tasks by name"
          as={AsyncRemoteSelectWidget}
          defaultOptions
          // Ensure we get current results, because there's not a refresh button
          cacheOptions={false}
          optionsFactory={cachedSearchApiTasks}
          loadingMessage={TasksLoadingMessage}
          noOptonsMessage={TasksNoOptionsMessage}
          factoryArgs={factoryArgs}
          config={controlRoomConfig}
          isClearable
        />
      }

      <SchemaField
        name={configName("sharedRunAsUserId")}
        schema={
          RUN_API_TASK_INPUT_SCHEMA.properties.sharedRunAsUserId as Schema
        }
        isRequired
      />

      {/*
        TODO: Implement user lookup for API Task users (https://github.com/pixiebrix/pixiebrix-extension/issues/7782)
            - This may end up being automatically set to the apitaskrunner
              for the current control room, so the user input here may go away
        <ConnectedFieldTemplate
          label="Run as User"
          name={configName("sharedRunAsUserId")}
          description="The user to run the api task"
          as={RemoteSelectWidget}
          optionsFactory={cachedFetchRunAsUsers} // Need a different user lookup here
          factoryArgs={factoryArgs}
          blankValue={"Select a user"}
          config={controlRoomConfig}
        />
         */}

      <ConnectedFieldTemplate
        label="Await Result?"
        name={configName("awaitResult")}
        description="Wait for the task to run and return the output"
        as={BooleanWidget}
      />
      {awaitResult && (
        <SchemaField
          label="Result Timeout (Milliseconds)"
          name={configName("maxWaitMillis")}
          schema={RUN_API_TASK_INPUT_SCHEMA.properties.maxWaitMillis as Schema}
          // Mark as required so the widget defaults to showing the number entry
          isRequired
        />
      )}

      {botId && (
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
  );
};

const ApiTaskOptions: React.FC<BlockOptionProps> = ({ name, configKey }) => {
  const configName = partial(joinName, name, configKey);
  return (
    <RequireIntegrationConfig
      integrationsSchema={
        RUN_API_TASK_INPUT_SCHEMA.properties.integrationConfig as Schema
      }
      integrationsFieldName={configName("integrationConfig")}
    >
      {({ sanitizedConfig }) => (
        <ApiTaskOptionsContent
          configName={configName}
          sanitizedConfig={sanitizedConfig}
        />
      )}
    </RequireIntegrationConfig>
  );
};

export default ApiTaskOptions;
