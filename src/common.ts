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

import { createSendScriptMessage } from "@/messaging/chrome";
import {
  DETECT_FRAMEWORK_VERSIONS,
  FrameworkMeta,
  READ_WINDOW,
  SEARCH_WINDOW,
} from "@/messaging/constants";

export const NOFICATIONS_Z_INDEX = 2_147_483_647;
export const MAX_Z_INDEX = NOFICATIONS_Z_INDEX - 1; // Let notifications always be higher
export const PANEL_FRAME_ID = "pixiebrix-extension";
export const PIXIEBRIX_DATA_ATTR = "data-pb-uuid";
export const PIXIEBRIX_READY_ATTRIBUTE = "data-pb-ready";
export const EXTENSION_POINT_DATA_ATTR = "data-pb-extension-point";

type ReadSpec = <T extends Record<string, string>>(arg: {
  pathSpec: T;
  waitMillis?: number;
}) => Promise<Record<keyof T, unknown>>;

export const withReadWindow = (createSendScriptMessage(
  READ_WINDOW
) as unknown) as ReadSpec;

export const withSearchWindow = createSendScriptMessage<{ results: unknown[] }>(
  SEARCH_WINDOW
);

export const withDetectFrameworkVersions = createSendScriptMessage<
  FrameworkMeta[]
>(DETECT_FRAMEWORK_VERSIONS);
