/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { type SanitizedServiceConfiguration } from "@/core";
import { type UnknownObject } from "@/types";

export type CommunityBotArgs = {
  service: SanitizedServiceConfiguration;
  fileId: string;
  deviceId: string;
  data: UnknownObject;
};

export type EnterpriseBotArgs = {
  service: SanitizedServiceConfiguration;
  fileId: string;

  /**
   * Run the bot in attended mode using the authenticated user's device.
   * @since 1.7.16
   */
  isAttended?: boolean;

  runAsUserIds: number[];
  poolIds: string[];
  data: UnknownObject;
};

export type BotArgs = (CommunityBotArgs | EnterpriseBotArgs) & {
  workspaceType?: "public" | "private" | null;
  awaitResult: boolean;
  maxWaitMillis: number;
};
