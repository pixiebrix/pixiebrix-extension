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

import { proxyService } from "@/background/messenger/api";
import { Transformer, UnknownObject } from "@/types";
import { mapValues } from "lodash";
import { BlockArg, BlockOptions, Schema, SchemaProperties } from "@/core";
import { validateRegistryId } from "@/types/helpers";
import { BusinessError } from "@/errors";
import { sleep } from "@/utils";
import {
  Activity,
  DeployResponse,
  ListResponse,
} from "@/contrib/automationanywhere/contract";

const MAX_WAIT_MILLIS = 30_000;
const POLL_MILLIS = 1000;

export const AUTOMATION_ANYWHERE_RUN_BOT_ID = validateRegistryId(
  "@pixiebrix/automation-anywhere/run-bot"
);

export const AUTOMATION_ANYWHERE_PROPERTIES: SchemaProperties = {
  service: {
    $ref:
      "https://app.pixiebrix.com/schemas/services/automation-anywhere/control-room",
  },
  fileId: {
    type: "string",
    description: "The file id of the bot",
    format: "\\d+",
  },
  deviceId: {
    type: "string",
    description: "The device to run the bot on",
    format: "\\d+",
  },
  data: {
    type: "object",
    description: "The input data for the bot",
    additionalProperties: true,
  },
  awaitResult: {
    type: "boolean",
    default: false,
    description: "Wait for the bot to complete and output the results.",
  },
};

export class RunBot extends Transformer {
  constructor() {
    super(
      AUTOMATION_ANYWHERE_RUN_BOT_ID,
      "Run Automation Anywhere Bot",
      "Run an Automation Anywhere Bot via the Control Room API"
    );
  }

  inputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    required: ["service", "fileId", "deviceId"],
    properties: AUTOMATION_ANYWHERE_PROPERTIES,
  };

  outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    additionalProperties: true,
  };

  async transform(
    { service, fileId, deviceId, data, awaitResult = false }: BlockArg,
    { logger }: BlockOptions
  ): Promise<UnknownObject> {
    const { data: deployData } = await proxyService<DeployResponse>(service, {
      // Using v2 because v3 requires runAsUserIds
      url: "/v2/automations/deploy",
      method: "post",
      data: {
        fileId,
        botInput: mapValues(data, (x) => ({ type: "STRING", string: x })),
        rdpEnabled: false,
        runElevated: false,
        setAsDefaultDevice: false,
        poolIds: [],
        currentUserDeviceId: deviceId,
        runAsUserIds: [],
        scheduleType: "INSTANT",
      },
    });

    if (!awaitResult) {
      return {};
    }

    const start = Date.now();

    await sleep(POLL_MILLIS);

    do {
      // // https://docs.automationanywhere.com/bundle/enterprise-v11.3/page/enterprise/topics/control-room/control-room-api/orchestrator-bot-progress.html
      // eslint-disable-next-line no-await-in-loop -- polling for response
      const { data: activityList } = await proxyService<ListResponse<Activity>>(
        service,
        {
          // This endpoint isn't working on Community Edition
          url: "/v2/activity/list",
          method: "post",
          data: {
            filter: {
              operator: "eq",
              field: "deploymentId",
              value: deployData.deploymentId,
            },
          },
        }
      );

      if (activityList.list.length > 0) {
        logger.error(
          `Multiple activities found for deployment: ${deployData.deploymentId}`
        );
        throw new Error("Multiple activities found for automation");
      }

      if (activityList.list.length === 0) {
        logger.error(
          `Activity not found for deployment: ${deployData.deploymentId}`
        );
        throw new BusinessError("Activity not found for automation");
      }

      if (activityList.list[0].status === "COMPLETED") {
        return mapValues(
          activityList.list[0].outputVariables ?? {},
          (x) => x.string
        );
      }

      if (
        // https://docs.automationanywhere.com/bundle/enterprise-v11.3/page/enterprise/topics/control-room/control-room-api/orchestrator-bot-progress.html
        [
          "DEPLOY_FAILED",
          "RUN_FAILED",
          "RUN_ABORTED",
          "RUN_TIMED_OUT",
        ].includes(activityList.list[0].status)
      ) {
        logger.error(
          `Automation Anywhere run failed: ${deployData.deploymentId}`,
          {
            activity: activityList.list[0],
          }
        );
        throw new BusinessError("Automation Anywhere run failed");
      }

      // eslint-disable-next-line no-await-in-loop -- polling for response
      await sleep(POLL_MILLIS);
    } while (Date.now() - start < MAX_WAIT_MILLIS);

    throw new BusinessError(
      `Automation Anywhere deploy did not finish in ${
        MAX_WAIT_MILLIS / 1000
      } seconds`
    );
  }
}
