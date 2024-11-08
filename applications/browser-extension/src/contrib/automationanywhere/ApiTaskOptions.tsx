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
import { type BrickOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import { partial } from "lodash";
import { joinName } from "../../utils/formUtils";
import RequireIntegrationConfig from "../../integrations/components/RequireIntegrationConfig";
import { RUN_API_TASK_INPUT_SCHEMA } from "./RunApiTask";
import { type SanitizedIntegrationConfig } from "../../integrations/integrationTypes";
import { type Schema } from "../../types/schemaTypes";
import { useField } from "formik";
import { type WorkspaceType } from "./contract";
import { type AsyncSelectStatusMessage } from "@/components/form/widgets/AsyncRemoteSelectWidget";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import RemoteFileInputArguments from "./RemoteFileInputArguments";
import useWorkspaceTypeOptionsFactoryArgs from "./useWorkspaceTypeOptionsFactoryArgs";
import WorkspaceTypeField from "./WorkspaceTypeField";
import FolderIdConfigAlert from "./FolderIdConfigAlert";
import AwaitResultField from "./AwaitResultField";
import RemoteFileSelectField from "./RemoteFileSelectField";
import { cachedSearchApiTasks } from "./aaApi";

const TasksLoadingMessage: AsyncSelectStatusMessage = () => (
  <span>Searching tasks...</span>
);
const TasksNoOptionsMessage: AsyncSelectStatusMessage = () => (
  <span>No tasks found</span>
);

const ApiTaskOptionsContent: React.FC<{
  configName: (...keys: string[]) => string;
  sanitizedConfig: SanitizedIntegrationConfig;
}> = ({ configName, sanitizedConfig: controlRoomConfig }) => {
  const workspaceTypeFieldName = configName("workspaceType");
  const [{ value: workspaceTypeFieldValue }] = useField<WorkspaceType | null>(
    workspaceTypeFieldName,
  );
  const fileIdFieldName = configName("botId");

  // Additional args passed to the remote options factories
  const taskSelectFactoryArgs = useWorkspaceTypeOptionsFactoryArgs({
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

      <RemoteFileSelectField
        fileIdFieldName={fileIdFieldName}
        label="API Task"
        description="The Automation Anywhere API Task to run"
        placeholder="Type to search API Tasks..."
        workspaceTypeFieldValue={workspaceTypeFieldValue}
        controlRoomConfig={controlRoomConfig}
        optionsFactory={cachedSearchApiTasks}
        extraFactoryArgs={taskSelectFactoryArgs}
        loadingMessage={TasksLoadingMessage}
        noOptionsMessage={TasksNoOptionsMessage}
        unknownOptionLabel={(value: string) => `Unknown Task ID: ${value}`}
      />

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

      <AwaitResultField
        awaitResultFieldName={configName("awaitResult")}
        maxWaitMillisFieldName={configName("maxWaitMillis")}
      />

      <RemoteFileInputArguments
        fileIdFieldName={fileIdFieldName}
        inputDataFieldName={configName("data")}
        controlRoomConfig={controlRoomConfig}
      />
    </>
  );
};

const ApiTaskOptions: React.FC<BrickOptionProps> = ({ name, configKey }) => {
  const configName = partial(joinName, name, configKey);
  return (
    <RequireIntegrationConfig
      integrationFieldSchema={
        RUN_API_TASK_INPUT_SCHEMA.properties.integrationConfig as Schema
      }
      integrationFieldName={configName("integrationConfig")}
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
