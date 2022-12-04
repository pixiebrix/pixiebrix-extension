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

import { Transformer, type UnknownObject } from "@/types";
import {
  type BlockArg,
  type BlockOptions,
  type Schema,
  type SchemaProperties,
} from "@/core";
import { validateRegistryId } from "@/types/helpers";
import { isCommunityControlRoom } from "@/contrib/automationanywhere/aaUtils";
import {
  DEFAULT_MAX_WAIT_MILLIS,
  pollEnterpriseResult,
  runCommunityBot,
  runEnterpriseBot,
} from "@/contrib/automationanywhere/aaApi";
import {
  type BotArgs,
  type EnterpriseBotArgs,
} from "@/contrib/automationanywhere/aaTypes";
import { BusinessError, PropError } from "@/errors/businessErrors";
import {
  CONTROL_ROOM_OAUTH_SERVICE_ID,
  CONTROL_ROOM_SERVICE_ID,
} from "@/services/constants";
import { isEmpty } from "lodash";
import { getCachedAuthData } from "@/background/messenger/api";

export const AUTOMATION_ANYWHERE_RUN_BOT_ID = validateRegistryId(
  "@pixiebrix/automation-anywhere/run-bot"
);

export const COMMON_PROPERTIES: SchemaProperties = {
  service: {
    anyOf: [CONTROL_ROOM_SERVICE_ID, CONTROL_ROOM_OAUTH_SERVICE_ID].map(
      (id) => ({
        $ref: `https://app.pixiebrix.com/schemas/services/${id}`,
      })
    ),
  },
  workspaceType: {
    type: "string",
    enum: ["private", "public"],
    description: "The workspace that contains the bot",
    default: "private",
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

export const ENTERPRISE_EDITION_COMMON_PROPERTIES: SchemaProperties = {
  awaitResult: {
    type: "boolean",
    default: false,
    description: "Wait for the bot to complete and return the output",
  },
  maxWaitMillis: {
    type: "number",
    default: DEFAULT_MAX_WAIT_MILLIS,
    description:
      "Maximum time (in milliseconds) to wait for the bot to complete when awaiting result.",
  },
};

export const ENTERPRISE_EDITION_PUBLIC_PROPERTIES: SchemaProperties = {
  runAsUserIds: {
    type: "array",
    description: "The user(s) to run the bot",
    items: {
      type: "string",
    },
  },
  poolIds: {
    type: "array",
    description: "A device pool that has at least one active device (optional)",
    items: {
      type: "string",
    },
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
          ...ENTERPRISE_EDITION_COMMON_PROPERTIES,
          ...ENTERPRISE_EDITION_PUBLIC_PROPERTIES,
        },
      },
      {
        type: "object",
        properties: {
          ...COMMON_PROPERTIES,
          ...ENTERPRISE_EDITION_COMMON_PROPERTIES,
        },
      },
    ],
  };

  defaultOutputKey = "bot";

  override outputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    additionalProperties: true,
  };

  async transform(
    args: BlockArg<BotArgs>,
    { logger }: BlockOptions
  ): Promise<UnknownObject> {
    const {
      awaitResult,
      maxWaitMillis = DEFAULT_MAX_WAIT_MILLIS,
      service,
      workspaceType,
    } = args;

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

    const enterpriseBotArgs: EnterpriseBotArgs =
      args as unknown as EnterpriseBotArgs;

    let runAsUserIds: number[];
    if (
      workspaceType === "public" ||
      !isEmpty(enterpriseBotArgs.runAsUserIds)
    ) {
      runAsUserIds = enterpriseBotArgs.runAsUserIds;
    } else if (
      workspaceType === "private" &&
      service.serviceId === CONTROL_ROOM_OAUTH_SERVICE_ID
    ) {
      throw new PropError(
        "Running local bots with OAuth2 authentication is not yet supported",
        this.id,
        "workspaceType",
        workspaceType
      );
    } else if (workspaceType === "private" || workspaceType == null) {
      // Get the user id from the cached token data. AA doesn't have any endpoints for retrieving the user id that
      // we could automatically fetch in the Page Editor
      const userData = (await getCachedAuthData(service.id)) as unknown as {
        user: { id: number };
      };
      if (!userData) {
        throw new BusinessError(
          "User profile for Control Room not found. Reconnect the Control Room integration"
        );
      }

      const userId = userData?.user?.id;
      if (userId == null) {
        // Indicates the Control Room provided an unexpected response shape
        throw new Error("Control Room token response missing user id.");
      }

      runAsUserIds = [userId];
    }

    const deployment = await runEnterpriseBot({
      ...enterpriseBotArgs,
      runAsUserIds,
    });

    if (!awaitResult) {
      return deployment;
    }

    return pollEnterpriseResult({
      service,
      deploymentId: deployment.deploymentId,
      logger,
      maxWaitMillis,
    });
  }
}
