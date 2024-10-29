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

import { getMethod } from "webext-messenger";

// Only one offscreen document can be active at a time. We use offscreen documents for error telemetry, so we won't
// be able to use different documents for different purposes because the error telemetry document needs to be active.
const offscreenPage = { page: "/offscreen.html" };

export const sendErrorViaErrorReporter = getMethod(
  "SEND_OFFSCREEN_ERROR",
  offscreenPage,
);

// XXX: ideally would use chrome.runtime.getContexts and look at the URL of the event page document. But must message
// due to the crashing bug in runtime.getContexts
export const getRecordingTabId = getMethod(
  "GET_RECORDING_TAB_ID",
  offscreenPage,
);
export const startRecording = getMethod("START_RECORDING", offscreenPage);
export const stopRecording = getMethod("STOP_RECORDING", offscreenPage);
