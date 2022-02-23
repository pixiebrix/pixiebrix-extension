/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { Logger, SanitizedServiceConfiguration } from "@/core";
import { Option } from "@/components/form/widgets/SelectWidget";
import { proxyService } from "@/background/messenger/api";
import {
  Activity,
  Bot,
  BOT_TYPE,
  DeployResponse,
  Device,
  DevicePool,
  FAILURE_STATUSES,
  Interface,
  ListResponse,
  RunAsUser,
} from "@/contrib/automationanywhere/contract";
import { cachePromiseMethod } from "@/utils/cachePromise";
import {
  interfaceToInputSchema,
  mapBotInput,
  selectBotOutput,
} from "@/contrib/automationanywhere/aaUtils";
import { sleep } from "@/utils";
import { BusinessError } from "@/errors";
import {
  CommunityBotArgs,
  EnterpriseBotArgs,
} from "@/contrib/automationanywhere/aaTypes";

const MAX_WAIT_MILLIS = 60_000;
const POLL_MILLIS = 2000;

async function fetchBots(
  config: SanitizedServiceConfiguration
): Promise<Option[]> {
  // This endpoint works on both community and Enterprise. The /v2/repository/file/list doesn't include
  // `type` field for filters or in the body
  const response = await proxyService<ListResponse<Bot>>(config, {
    url: `/v2/repository/folders/${config.config.folderId}/list`,
    method: "POST",
    data: {
      filter: {
        operator: "eq",
        field: "type",
        value: BOT_TYPE,
      },
    },
  });
  const bots = response.data.list ?? [];
  return bots.map((bot) => ({
    value: bot.id,
    label: bot.name,
  }));
}

export const cachedFetchBots = cachePromiseMethod(["aa:fetchBots"], fetchBots);

async function fetchDevices(
  config: SanitizedServiceConfiguration
): Promise<Option[]> {
  // HACK: depend on cachedFetchBots to avoid concurrent requests to the proxy. Simultaneous calls to get the
  // token causes a server error on Community Edition
  await cachedFetchBots(config);

  const response = await proxyService<ListResponse<Device>>(config, {
    url: "/v2/devices/list",
    method: "POST",
    data: {},
  });
  const devices = response.data.list ?? [];
  return devices.map((device) => ({
    value: device.id,
    label: device.nickname
      ? `${device.nickname} (${device.hostName})`
      : device.hostName,
  }));
}

export const cachedFetchDevices = cachePromiseMethod(
  ["aa:fetchDevices"],
  fetchDevices
);

async function fetchDevicePools(
  config: SanitizedServiceConfiguration
): Promise<Option[]> {
  // HACK: depend on cachedFetchBots to avoid concurrent requests to the proxy. Simultaneous calls to get the
  // token causes a server error on Community Edition
  await cachedFetchBots(config);

  const response = await proxyService<ListResponse<DevicePool>>(config, {
    url: "/v2/devices/pools/list",
    method: "POST",
    data: {},
  });
  const devicePools = response.data.list ?? [];
  return devicePools.map((pool) => ({
    value: pool.id,
    label: pool.name,
  }));
}

export const cachedFetchDevicePools = cachePromiseMethod(
  ["aa:fetchDevicePools"],
  fetchDevicePools
);

async function fetchRunAsUsers(
  config: SanitizedServiceConfiguration
): Promise<Option[]> {
  // HACK: depend on cachedFetchBots to avoid concurrent requests to the proxy. Simultaneous calls to get the
  // token causes a server error
  await cachedFetchBots(config);

  const { data } = await proxyService<ListResponse<RunAsUser>>(config, {
    url: "/v1/devices/runasusers/list",
    method: "POST",
    // TODO: handle pagination - potentially via search query?
    data: {},
  });
  const users = data.list ?? [];
  return users.map((user) => ({
    value: user.id,
    label: user.username,
  }));
}

export const cachedFetchRunAsUsers = cachePromiseMethod(
  ["aa:fetchRunAsUsers"],
  fetchRunAsUsers
);

async function fetchSchema(
  config: SanitizedServiceConfiguration,
  fileId: string
) {
  if (config && fileId) {
    const response = await proxyService<Interface>(config, {
      url: `/v1/filecontent/${fileId}/interface`,
      method: "GET",
    });

    return interfaceToInputSchema(response.data);
  }
}

export const cachedFetchSchema = cachePromiseMethod(
  ["aa:fetchSchema"],
  fetchSchema
);

export async function runCommunityBot({
  service,
  fileId,
  data,
  deviceId,
}: CommunityBotArgs): Promise<void> {
  // Don't bother returning the DeployResponse because it's just "0" for all community deployments
  // https://docs.automationanywhere.com/bundle/enterprise-v11.3/page/enterprise/topics/control-room/control-room-api/orchestrator-bot-deploy.html
  await proxyService<DeployResponse>(service, {
    url: "/v2/automations/deploy",
    method: "post",
    data: {
      fileId,
      // https://apeople.automationanywhere.com/s/question/0D56F00008YEOjSSAX/how-to-pass-input-values-while-triggering-the-bot-through-control-room-api-?language=en_US
      botVariables: mapBotInput(data),
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
  const { data: deployData } = await proxyService<DeployResponse>(service, {
    url: "/v3/automations/deploy",
    method: "post",
    data: {
      fileId,
      botInput: mapBotInput(data),
      // Use the runAsUser's default device instead of a device pool
      overrideDefaultDevice: poolIds?.length > 0,
      numOfRunAsUsersToUse: 1,
      poolIds,
      runAsUserIds,
    },
  });

  return deployData;
}

export async function pollEnterpriseResult({
  service,
  deploymentId,
  logger,
}: {
  service: SanitizedServiceConfiguration;
  deploymentId: string;
  logger: Logger;
}) {
  const start = Date.now();

  // Sleep first because it's unlikely it will be completed immediately after the running the bot
  await sleep(POLL_MILLIS);

  do {
    // // https://docs.automationanywhere.com/bundle/enterprise-v11.3/page/enterprise/topics/control-room/control-room-api/orchestrator-bot-progress.html
    // eslint-disable-next-line no-await-in-loop -- polling for response
    const { data: activityList } = await proxyService<ListResponse<Activity>>(
      service,
      {
        url: "/v2/activity/list",
        method: "post",
        data: {
          filter: {
            operator: "eq",
            field: "deploymentId",
            value: deploymentId,
          },
        },
      }
    );

    if (activityList.list.length > 1) {
      logger.error(
        `Multiple activities found for deployment: ${deploymentId}`,
        {
          deploymentId,
          activities: activityList.list,
        }
      );
      throw new BusinessError(
        "Multiple activity instances found for automation"
      );
    }

    if (activityList.list.length === 0) {
      logger.error(`Activity not found for deployment: ${deploymentId}`, {
        deploymentId,
      });
      throw new BusinessError("Activity not found for deployment");
    }

    const activity = activityList.list[0];

    if (activity.status === "COMPLETED") {
      return selectBotOutput(activity);
    }

    if (FAILURE_STATUSES.has(activity.status)) {
      logger.error(`Automation Anywhere run failed: ${deploymentId}`, {
        activity,
      });
      throw new BusinessError("Automation Anywhere run failed");
    }

    // eslint-disable-next-line no-await-in-loop -- polling for response
    await sleep(POLL_MILLIS);
  } while (Date.now() - start < MAX_WAIT_MILLIS);

  throw new BusinessError(
    `Bot did not finish in ${MAX_WAIT_MILLIS / 1000} seconds`
  );
}
