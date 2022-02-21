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

import { Transformer, UnknownObject } from "@/types";
import { BlockArg, BlockOptions, Schema, SchemaProperties } from "@/core";
import { validateRegistryId } from "@/types/helpers";
import { PropError } from "@/errors";
import { isCommunityControlRoom } from "@/contrib/automationanywhere/aaUtils";
import {
  pollEnterpriseResult,
  runCommunityBot,
  runEnterpriseBot,
} from "@/contrib/automationanywhere/aaApi";
import { BotArgs } from "@/contrib/automationanywhere/aaTypes";

export const AUTOMATION_ANYWHERE_RUN_BOT_ID = validateRegistryId(
  "@pixiebrix/automation-anywhere/run-bot"
);

export const COMMON_PROPERTIES: SchemaProperties = {
  service: {
    $ref: "https://app.pixiebrix.com/schemas/services/automation-anywhere/control-room",
  },
  fileId: {
    type: "string",
    description: "The file id of the bot",
    format: "\\d+",
  },
  data: {
    type: "object",
    description: "The input data for the bot",
    additionalProperties: true,
  },
};

const COMMUNITY_EDITION_PROPERTIES: SchemaProperties = {
  deviceId: {
    type: "string",
    description: "The device to run the bot",
    format: "\\d+",
  },
};

const ENTERPRISE_EDITION_PROPERTIES: SchemaProperties = {
  runAsUsers: {
    type: "array",
    description: "The user(s) to run the bot",
    items: {
      type: "string",
    },
  },
  poolIds: {
    description: "A device pool that has at least one active device (optional)",
    items: {
      type: "string",
    },
  },
  awaitResult: {
    type: "boolean",
    default: false,
    description: "Wait for the bot to complete and return the output",
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
    anyOf: [
      {
        type: "object",
        properties: {
          ...COMMON_PROPERTIES,
          ...COMMUNITY_EDITION_PROPERTIES,
        },
      },
      {
        type: "object",
        properties: {
          ...COMMON_PROPERTIES,
          ...ENTERPRISE_EDITION_PROPERTIES,
        },
      },
    ],
  };

  override outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    additionalProperties: true,
  };

  async transform(
    args: BlockArg<BotArgs>,
    { logger }: BlockOptions
  ): Promise<UnknownObject> {
    const { awaitResult, service } = args;

    if (isCommunityControlRoom(service.config.controlRoomUrl)) {
      if (!("deviceId" in args)) {
        throw new PropError(
          "deviceId is required for Community Edition",
          this.id,
          "deviceId",
          undefined
        );
      }

      if (awaitResult) {
        throw new PropError(
          "Cannot await result with Community Edition",
          this.id,
          "awaitResult",
          awaitResult
        );
      }

      await runCommunityBot(args);
      return {};
    }

    if (!("runAsUserIds" in args)) {
      throw new PropError(
        "runAsUserIds is required for Enterprise Edition",
        this.id,
        "runAsUserIds",
        undefined
      );
    }

    const deployment = await runEnterpriseBot(args);

    if (!awaitResult) {
      return deployment;
    }

    return pollEnterpriseResult({
      service,
      deploymentId: deployment.deploymentId,
      logger,
    });
  }
}
