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

import { type Logger } from "../../types/loggerTypes";
import { type Option } from "@/components/form/widgets/SelectWidget";
import {
  type Activity,
  type ApiTaskResponse,
  type DeployResponse,
  type Device,
  type DevicePool,
  type Execution,
  FAILURE_STATUSES,
  type File,
  FileType,
  type Folder,
  type Interface,
  type ListResponse,
  type RunAsUser,
  type WorkspaceType,
} from "./contract";
import { cachePromiseMethod } from "../../utils/cachePromise";
import {
  interfaceToInputSchema,
  mapBotInput,
  selectBotOutput,
} from "./aaUtils";
import {
  type ApiTaskArgs,
  type CommunityBotArgs,
  type EnterpriseBotArgs,
} from "./aaTypes";
import { BusinessError } from "@/errors/businessErrors";
import { castArray, cloneDeep, isEmpty, partial, sortBy } from "lodash";
import type { NetworkRequestConfig } from "../../types/networkTypes";
import { type SanitizedIntegrationConfig } from "../../integrations/integrationTypes";
import { pollUntilTruthy } from "../../utils/promiseUtils";
import { isNullOrBlank } from "../../utils/stringUtils";
import { sleep } from "../../utils/timeUtils";

// XXX: using the ambient platform object for now. In the future, we might want to wrap all these methods in a class
// and pass the platform and integration config as a constructor argument
import { getPlatform } from "../../platform/platformContext";
import { type SetRequired } from "type-fest";

// https://docs.automationanywhere.com/bundle/enterprise-v2019/page/enterprise-cloud/topics/control-room/control-room-api/cloud-api-filter-request.html
// Same as default for Control Room
const PAGINATION_LIMIT = 100;

export const DEFAULT_MAX_WAIT_MILLIS = 60_000;
const POLL_MILLIS = 2000;

type SearchPayload = {
  sort: Array<{
    field: string;
    direction: "asc" | "desc";
  }>;
  filter: {
    operator: "and" | "or";
    operands: Array<{
      operator: "substring" | "eq";
      field: string;
      value: string;
    }>;
  };
};

const SORT_BY_NAME: Pick<SearchPayload, "sort"> = {
  sort: [
    {
      field: "name",
      direction: "asc",
    },
  ],
};

type PaginationPayload = {
  page: { offset: number; length: number };
};

/**
 * Check a control room integration to see if the authentication is valid
 */
export async function checkConfigAuth(
  config: SanitizedIntegrationConfig,
): Promise<boolean> {
  try {
    const response = await getPlatform().request<boolean>(config, {
      url: "v1/authentication/token",
      method: "GET",
    });
    return response.data;
  } catch (error) {
    console.warn("Error while validating control room integration", error);
    return false;
  }
}

/**
 * Fetch paginated Control Room responses.
 * @param config the control room integration configuration
 * @param requestConfig the axios configuration for the request
 * @param maxPages maximum number of pages to fetch, defaults to all pages
 */
async function fetchPages<TData>(
  config: SanitizedIntegrationConfig,
  requestConfig: SetRequired<
    NetworkRequestConfig<Partial<SearchPayload & PaginationPayload>>,
    "data"
  >,
  { maxPages = Number.MAX_SAFE_INTEGER }: { maxPages?: number } = {},
): Promise<TData[]> {
  // https://docs.automationanywhere.com/bundle/enterprise-v2019/page/enterprise-cloud/topics/control-room/control-room-api/cloud-api-filter-request.html

  if (requestConfig.data.page) {
    throw new Error("pagination parameter already set on request config");
  }

  const paginatedRequestConfig = cloneDeep(requestConfig);
  paginatedRequestConfig.data.page = {
    offset: 0,
    length: PAGINATION_LIMIT,
  };

  const initialResponse = await getPlatform().request<ListResponse<TData>>(
    config,
    paginatedRequestConfig,
  );

  if (initialResponse.data.list == null) {
    // Use TypeError instead of BusinessError to ensure we send it to Application error telemetry if we're calling API incorrectly
    throw new TypeError("Expected list response from Control Room");
  }

  const results: TData[] = [...initialResponse.data.list];
  const total = initialResponse.data.page.totalFilter;

  // Note that CR API uses offset/length instead of page/size
  let page = 0;
  let offset = results.length;
  while (offset < total && page < maxPages) {
    paginatedRequestConfig.data.page = {
      offset,
      length: PAGINATION_LIMIT,
    };
    // eslint-disable-next-line no-await-in-loop -- be conservative on number of concurrent requests to CR
    const response = await getPlatform().request<ListResponse<TData>>(
      config,
      paginatedRequestConfig,
    );
    results.push(...response.data.list);
    offset += response.data.list.length;
    page += 1;
  }

  return results;
}

/**
 * Return information about a bot in a Control Room.
 */
async function fetchBotFile(
  config: SanitizedIntegrationConfig,
  fileId: string,
): Promise<File> {
  // The same API endpoint can be used for any file, but for now assume it's a bot
  const response = await getPlatform().request<File>(config, {
    url: `/v2/repository/files/${fileId}`,
    method: "GET",
  });
  return response.data;
}

export const cachedFetchBotFile = cachePromiseMethod(
  ["aa:fetchBotFile"],
  fetchBotFile,
);

/**
 * Return information about a bot in a Control Room.
 */
async function fetchFolder(
  config: SanitizedIntegrationConfig,
  folderId: string,
): Promise<Folder> {
  // The same API endpoint can be used for any file, but for now assume it's a bot
  const response = await getPlatform().request<Folder>(config, {
    url: `/v2/repository/files/${folderId}`,
    method: "GET",
  });
  return response.data;
}

export const cachedFetchFolder = cachePromiseMethod(
  ["aa:fetchFolder"],
  fetchFolder,
);

async function searchFiles(
  fileType: FileType,
  config: SanitizedIntegrationConfig,
  options: {
    workspaceType: WorkspaceType;
    query: string;
    value: string | null;
  },
): Promise<Option[]> {
  if (isNullOrBlank(options.workspaceType)) {
    throw new TypeError("workspaceType is required");
  }

  const fileTypeOperand = {
    operator: "eq" as const,
    field: "type",
    value: fileType,
  };

  let searchPayload: SearchPayload = {
    ...SORT_BY_NAME,
    filter: {
      operator: "and",
      operands: [
        {
          operator: "substring",
          field: "name",
          value: options.query ?? "",
        },
        fileTypeOperand,
      ],
    },
  };

  if (isNullOrBlank(options.query) && !isNullOrBlank(options.value)) {
    // Show the selected value + a page of results
    searchPayload = {
      ...SORT_BY_NAME,
      filter: {
        operator: "or",
        operands: [
          {
            operator: "eq",
            field: "id",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked above with isNullOrBlank
            value: options.value!,
          },
          fileTypeOperand,
        ],
      },
    };
  }

  let files: File[];

  // The folderId field on the integration is now deprecated. See BotOptions for the alert shown to user if
  // the Page Editor configuration is only showing bots for the folder id.
  if (isEmpty(config.config.folderId)) {
    files = await fetchPages<File>(
      config,
      {
        url: `/v2/repository/workspaces/${options.workspaceType}/files/list`,
        method: "POST",
        data: searchPayload,
      },
      { maxPages: 1 },
    );
  } else {
    // The /folders/:id/list endpoint works on both community and Enterprise. The /v2/repository/file/list doesn't
    // include `type` field for filters or in the body or the response
    files = await fetchPages<File>(
      config,
      {
        url: `/v2/repository/folders/${config.config.folderId}/list`,
        method: "POST",
        data: searchPayload,
      },
      { maxPages: 1 },
    );
  }

  return files.map((file) => ({
    value: file.id,
    label: file.name,
  }));
}

export const cachedSearchBots = cachePromiseMethod(
  ["aa:fetchBots"],
  partial(searchFiles, FileType.BOT),
);

export const cachedSearchApiTasks = cachePromiseMethod(
  ["aa:fetchApiTasks"],
  partial(searchFiles, FileType.API_TASK),
);

async function fetchDevices(
  config: SanitizedIntegrationConfig,
): Promise<Option[]> {
  const devices = await fetchPages<Device>(config, {
    url: "/v2/devices/list",
    method: "POST",
    data: {},
  });

  const selectLabel = (device: Device) =>
    device.nickname
      ? `${device.nickname} (${device.hostName})`
      : device.hostName;

  return sortBy(
    devices.map((device) => ({
      value: device.id,
      label: selectLabel(device),
    })),
    (option) => option.label,
  );
}

export const cachedFetchDevices = cachePromiseMethod(
  ["aa:fetchDevices"],
  fetchDevices,
);

async function fetchDevicePools(
  config: SanitizedIntegrationConfig,
): Promise<Option[]> {
  const devicePools = await fetchPages<DevicePool>(config, {
    url: "/v2/devices/pools/list",
    method: "POST",
    data: { ...SORT_BY_NAME },
  });
  return devicePools.map((pool) => ({
    value: pool.id,
    label: pool.name,
  }));
}

export const cachedFetchDevicePools = cachePromiseMethod(
  ["aa:fetchDevicePools"],
  fetchDevicePools,
);

async function fetchRunAsUsers(
  config: SanitizedIntegrationConfig,
): Promise<Option[]> {
  const users = await fetchPages<RunAsUser>(config, {
    url: "/v1/devices/runasusers/list",
    method: "POST",
    data: {},
  });
  return sortBy(users, (user) => user.username).map((user) => ({
    value: user.id,
    label: user.username,
  }));
}

export const cachedFetchRunAsUsers = cachePromiseMethod(
  ["aa:fetchRunAsUsers"],
  fetchRunAsUsers,
);

async function fetchSchema(config: SanitizedIntegrationConfig, fileId: string) {
  if (config && fileId) {
    const response = await getPlatform().request<Interface>(config, {
      url: `/v1/filecontent/${fileId}/interface`,
      method: "GET",
    });

    return interfaceToInputSchema(response.data);
  }
}

export const cachedFetchSchema = cachePromiseMethod(
  ["aa:fetchSchema"],
  fetchSchema,
);

export async function runCommunityBot({
  service,
  fileId,
  data,
  deviceId,
}: CommunityBotArgs): Promise<void> {
  // Don't bother returning the DeployResponse because it's just "0" for all community deployments
  // https://docs.automationanywhere.com/bundle/enterprise-v11.3/page/enterprise/topics/control-room/control-room-api/orchestrator-bot-deploy.html
  await getPlatform().request<DeployResponse>(service, {
    url: "/v2/automations/deploy",
    method: "post",
    data: {
      fileId,
      botInput: mapBotInput(data),
      currentUserDeviceId: deviceId,
      scheduleType: "INSTANT",
    },
  });
}

export async function runEnterpriseBot({
  service,
  fileId,
  data,
  runAsUserIds = [],
  poolIds = [],
}: EnterpriseBotArgs) {
  // https://docs.automationanywhere.com/bundle/enterprise-v2019/page/enterprise-cloud/topics/control-room/control-room-api/cloud-bot-deploy-task.html
  const { data: deployData } = await getPlatform().request<DeployResponse>(
    service,
    {
      url: "/v3/automations/deploy",
      method: "post",
      data: {
        fileId,
        botInput: mapBotInput(data),
        // Use the runAsUser's default device instead of a device pool
        overrideDefaultDevice: poolIds?.length > 0,
        numOfRunAsUsersToUse: 1,
        poolIds,
        runAsUserIds: castArray(runAsUserIds),
      },
    },
  );

  return deployData;
}

export async function runApiTask({
  integrationConfig,
  botId,
  sharedRunAsUserId,
  data,
  automationName,
}: Pick<
  ApiTaskArgs,
  | "integrationConfig"
  | "botId"
  | "sharedRunAsUserId"
  | "data"
  | "automationName"
>): Promise<ApiTaskResponse> {
  const { data: response } = await getPlatform().request<ApiTaskResponse>(
    integrationConfig,
    {
      url: "/v4/automations/deploy",
      method: "post",
      data: {
        botId,
        automationName,
        executionType: "RUN_NOW",
        headlessRequest: {
          numberOfExecutions: 1,
          queueOnSlotsExhaustion: false,
          sharedRunAsUserId,
        },
        botInput: mapBotInput(data),
      },
    },
  );

  return response;
}

export async function pollEnterpriseResult({
  service,
  deploymentId,
  logger,
  maxWaitMillis = DEFAULT_MAX_WAIT_MILLIS,
}: {
  service: SanitizedIntegrationConfig;
  deploymentId: string;
  logger: Logger;
  maxWaitMillis?: number;
}) {
  const maxWaitSeconds = Math.round(maxWaitMillis / 1000);

  // Whether we've found any activity record (regardless of state)
  // https://github.com/pixiebrix/pixiebrix-extension/issues/6900
  let activityFound = false;

  const poll = async () => {
    // Sleep first because it's unlikely activity will be available/completed immediately after the running the bot
    await sleep(POLL_MILLIS);

    // https://docs.automationanywhere.com/bundle/enterprise-v11.3/page/enterprise/topics/control-room/control-room-api/orchestrator-bot-progress.html
    const { data: activityList } = await getPlatform().request<
      ListResponse<Activity>
    >(service, {
      url: "/v3/activity/list",
      method: "post",
      data: {
        filter: {
          operator: "eq",
          field: "deploymentId",
          value: deploymentId,
        },
      },
    });

    const activity = activityList.list[0];
    // Check for empty list, also narrow the type of activity to non-null
    if (activity == null) {
      // Don't fail immediately. There may be a race-condition where the activity isn't available immediately
      // See https://github.com/pixiebrix/pixiebrix-extension/issues/6900
      return;
    }

    activityFound = true;

    if (activityList.list.length > 1) {
      logger.error(
        `Multiple activities found for deployment: ${deploymentId}`,
        {
          deploymentId,
          activities: activityList.list,
        },
      );
      throw new BusinessError(
        "Multiple activity instances found for bot deployment",
      );
    }

    if (activity.status === "COMPLETED") {
      return activity;
    }

    if (FAILURE_STATUSES.has(activity.status)) {
      logger.error(`Automation Anywhere run failed: ${deploymentId}`, {
        activity,
      });
      throw new BusinessError("Automation Anywhere run failed");
    }
  };

  const completedActivity = await pollUntilTruthy(poll, {
    intervalMillis: 0, // Already covered by the inline `sleep`
    maxWaitMillis,
  });

  if (!activityFound) {
    logger.error(`Activity not found for deployment: ${deploymentId}`, {
      deploymentId,
    });
    throw new BusinessError(
      `Activity not found for deployment in ${maxWaitSeconds} seconds`,
    );
  }

  if (completedActivity) {
    const { data: execution } = await getPlatform().request<Execution>(
      service,
      {
        url: `/v3/activity/execution/${completedActivity.id}`,
        method: "get",
      },
    );

    return selectBotOutput(execution);
  }

  throw new BusinessError(`Bot did not finish in ${maxWaitSeconds} seconds`);
}
