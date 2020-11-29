/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import "regenerator-runtime/runtime";
import "core-js/stable";
import { createSendScriptMessage } from "./messaging/chrome";
import {
  DETECT_FRAMEWORK_VERSIONS,
  READ_WINDOW,
  SEARCH_WINDOW,
} from "./messaging/constants";

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

export const withDetectFrameworkVersions = createSendScriptMessage(
  DETECT_FRAMEWORK_VERSIONS
);
