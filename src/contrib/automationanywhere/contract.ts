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

export type ListResponse<TData> = {
  page: {
    offset: number;
    total: number;
    totalFilter: number;
  };
  list: TData[];
};

export enum FileType {
  BOT = "application/vnd.aa.taskbot",
  API_TASK = "application/vnd.aa.headlessbot",
}

// Bots in the "Private" workspace are also referred to as Local bots
export type WorkspaceType = "public" | "private";
type VariableType = "STRING" | "NUMBER" | "BOOLEAN" | "DICTIONARY" | "TABLE";

export type Variable = {
  name: string;
  input: boolean;
  output: boolean;
  type: VariableType;
  description: string;
  defaultValue?: {
    type: VariableType;
    string: string;
    number: string;
    boolean: string;
  };
};

export type Interface = {
  variables: Variable[];
};

// https://docs.automationanywhere.com/bundle/enterprise-v2019/page/enterprise-cloud/topics/control-room/control-room-api/cloud-api-workspaces-list.html
export type Folder = {
  id: string;
  parentId: string;
  name: string;
  folder: true;
};

// https://docs.automationanywhere.com/bundle/enterprise-v11.3/page/enterprise/topics/control-room/control-room-api/orchestrator-bot-details.html
export type File = {
  /**
   * The numeric file id, as a numeric string.
   */
  id: string;
  /**
   * The numeric parent folder id, as a numeric string.
   */
  parentId: string;
  name: string;
  path: string;
  type: FileType;
  workspaceType: "PUBLIC" | "PRIVATE";
};

export type Device = {
  id: string;
  type: string;
  hostName: string;
  status: "CONNECTED";
  botAgentVersion: string;
  nickname: string;
};

export type DevicePool = {
  id: string;
  name: string;
  status: string;
  deviceCount: string;
};

export type RunAsUser = {
  id: string;
  username: string;
};

export type DeployResponse = {
  // https://docs.automationanywhere.com/bundle/enterprise-v11.3/page/enterprise/topics/control-room/control-room-api/orchestrator-bot-deploy.html
  automationId: string;
  deploymentId: string;
};

/**
 * The response from the Automation Anywhere API Task endpoint.
 *
 * @see https://docs.automationanywhere.com/bundle/enterprise-v2019/page/api-task-on-demand-endpoint.html
 */
export type ApiTaskResponse = {
  deploymentId: string;
  // If an automation name is not given in the request, a random name will be assigned to the automation and returned here
  automationName: string;
};

export const FAILURE_STATUSES = new Set([
  // https://docs.automationanywhere.com/bundle/enterprise-v11.3/page/enterprise/topics/control-room/control-room-api/orchestrator-bot-progress.html
  "DEPLOY_FAILED",
  "RUN_FAILED",
  "RUN_ABORTED",
  "RUN_TIMED_OUT",
]);

// Note: The following AA response types were reverse-engineered from the
// Automation Anywhere Run Bot API response payloads.

type TableColumnSchema = {
  name: string;
  type: string;
  subtype: string;
};

type TableRow = {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define -- recursive type
  values: OutputValue[];
};

export type TableValue = {
  schema: TableColumnSchema[];
  rows: TableRow[];
};

export type OutputValue = {
  type: VariableType;
  string: string;
  number: string;
  boolean: string;
  dictionary: Array<{
    key: string;
    value: OutputValue;
  }>;
  // Seems like table property is optional on the response value objects
  table?: TableValue;
};

export type Activity = {
  /**
   * The id of the activity
   */
  id: string;
  status: string;
  /**
   * The id of the deployment
   */
  deploymentId: string;
};

export type Execution = {
  botOutVariables?: {
    values: Record<string, OutputValue>;
  };
};
