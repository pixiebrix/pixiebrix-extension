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

import { TransformerABC } from "@/types/bricks/transformerTypes";
import { validateRegistryId } from "@/types/helpers";
import { type Schema } from "@/types/schemaTypes";
import {
  CONTROL_ROOM_OAUTH_INTEGRATION_ID,
  CONTROL_ROOM_TOKEN_INTEGRATION_ID,
} from "@/integrations/constants";
import {
  DEFAULT_MAX_WAIT_MILLIS,
  pollEnterpriseResult,
  runApiTask,
} from "@/contrib/automationanywhere/aaApi";
import { type ApiTaskArgs } from "@/contrib/automationanywhere/aaTypes";
import { type BrickArgs, type BrickOptions } from "@/types/runtimeTypes";
import { BusinessError } from "@/errors/businessErrors";
import { minimalSchemaFactory } from "@/utils/schemaUtils";
import { type SetRequired } from "type-fest";

export const RUN_API_TASK_INPUT_SCHEMA: SetRequired<Schema, "properties"> = {
  $schema: "https://json-schema.org/draft/2019-09/schema#",
  type: "object",
  properties: {
    integrationConfig: {
      oneOf: [
        CONTROL_ROOM_TOKEN_INTEGRATION_ID,
        CONTROL_ROOM_OAUTH_INTEGRATION_ID,
      ].map((id) => ({
        $ref: `https://app.pixiebrix.com/schemas/services/${id}`,
      })),
    },
    botId: {
      type: "string",
      title: "Automation ID",
      description: "The id of the API Task to deploy",
      format: String.raw`\d+`,
    },
    sharedRunAsUserId: {
      type: "number",
      title: "Run As User ID",
      // See: https://github.com/pixiebrix/pixiebrix-extension/issues/7782
      description:
        "The user to run the API Task. In most cases, this should be the id of the [apitaskrunner user](https://docs.automationanywhere.com/bundle/enterprise-v2019/page/run-as-user-api-task.html)",
    },
    data: {
      type: "object",
      title: "Automation Inputs",
      description: "The input data for the API Task",
      additionalProperties: true,
    },
    automationName: {
      type: "string",
      title: "Automation Name",
      description:
        "Name of the API Task to be deployed. You can enter a name to easily identify your task.",
    },
    awaitResult: {
      type: "boolean",
      title: "Await Result",
      default: false,
      description: "Wait for the API Task to complete and return the output",
    },
    maxWaitMillis: {
      type: "number",
      title: "Result Timeout",
      default: DEFAULT_MAX_WAIT_MILLIS,
      description:
        "Maximum time (in milliseconds) to wait for the api task to complete when awaiting result.",
    },
  },
  required: ["integrationConfig", "botId", "sharedRunAsUserId", "awaitResult"],
};

export class RunApiTask extends TransformerABC {
  static BRICK_ID = validateRegistryId(
    "@pixiebrix/automation-anywhere/run-api-task",
  );

  constructor() {
    super(
      RunApiTask.BRICK_ID,
      "Run Automation Anywhere API Task",
      "Run an Automation Anywhere API Task",
    );
  }

  inputSchema = RUN_API_TASK_INPUT_SCHEMA;

  override defaultOutputKey = "apiTask";

  override outputSchema = minimalSchemaFactory();

  async transform(
    {
      integrationConfig,
      botId,
      sharedRunAsUserId,
      data,
      automationName,
      awaitResult,
      maxWaitMillis,
    }: BrickArgs<ApiTaskArgs>,
    { logger }: BrickOptions,
  ): Promise<UnknownObject> {
    const taskResponse = await runApiTask({
      integrationConfig,
      botId,
      sharedRunAsUserId,
      data,
      automationName,
    });

    if (!awaitResult) {
      return taskResponse;
    }

    if (taskResponse.deploymentId == null) {
      throw new BusinessError(
        "API Task deployment ID not found in Control Room response",
      );
    }

    return pollEnterpriseResult({
      service: integrationConfig,
      deploymentId: taskResponse.deploymentId,
      logger,
      maxWaitMillis,
    });
  }
}
