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

import { registerMethods } from "webext-messenger";
import { sendErrorViaErrorReporter } from "@/offscreen/errorReport";
import {
  extractRecordingTabId,
  startRecording,
  stopRecording,
} from "@/offscreen/recording";
import { noop } from "lodash";

declare global {
  interface MessengerMethods {
    SEND_OFFSCREEN_ERROR: typeof sendErrorViaErrorReporter;
    GET_RECORDING_TAB_ID: typeof extractRecordingTabId;
    START_RECORDING: typeof startRecording;
    STOP_RECORDING: typeof stopRecording;
    OFFSCREEN_PING: typeof noop;
  }
}

export default function registerOffscreenMessenger(): void {
  registerMethods({
    SEND_OFFSCREEN_ERROR: sendErrorViaErrorReporter,
    GET_RECORDING_TAB_ID: extractRecordingTabId,
    START_RECORDING: startRecording,
    STOP_RECORDING: stopRecording,
    OFFSCREEN_PING: noop,
  });
}
