/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import { Effect } from "@/types";
import { mapValues } from "lodash";
import { BlockArg, BlockOptions, Schema, SchemaProperties } from "@/core";
import { validateRegistryId } from "@/types/helpers";

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
    additionalProperties: true,
  },
};

interface DeployResponse {
  automationId: string;
  deploymentId: string;
}

export class RunBot extends Effect {
  constructor() {
    super(
      AUTOMATION_ANYWHERE_RUN_BOT_ID,
      "Run Automation Anywhere Bot",
      "Run an Automation Anywhere Bot via the Enterprise Control Room API"
    );
  }

  inputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    required: ["service", "fileId", "deviceId"],
    properties: AUTOMATION_ANYWHERE_PROPERTIES,
  };

  async effect(
    { service, fileId, deviceId, data }: BlockArg,
    options: BlockOptions
  ): Promise<void> {
    const { data: responseData } = await proxyService<DeployResponse>(service, {
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

    options.logger.info(`Automation id ${responseData.automationId}`);
  }
}
