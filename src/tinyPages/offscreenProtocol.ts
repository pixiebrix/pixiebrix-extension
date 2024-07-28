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

import type { SerializedError } from "@/types/messengerTypes";
import type { TelemetryUser } from "@/telemetry/telemetryTypes";
import type { MessageContext } from "@/types/loggerTypes";
import type { SemVerString } from "@/types/registryTypes";
import type { Nullishable } from "@/utils/nullishUtils";

export type RecordErrorMessage = {
  target: "offscreen-doc";
  type: "record-error";
  data: {
    error: SerializedError;
    errorMessage: string;
    errorReporterInitInfo: {
      versionName: string;
      telemetryUser: TelemetryUser;
    };
    messageContext: MessageContext &
      UnknownObject & { extensionVersion: SemVerString };
  };
};

export type StartAudioCaptureMessage = {
  type: "start-recording";
  target: "offscreen";
  data: {
    /**
     * The Deepgram API key.
     */
    apiKey: string;
    tabId: number;
    tabStreamId: Nullishable<string>;
    captureMicrophone: boolean;
  };
};

export type StopAudioCaptureMessage = {
  type: "stop-recording";
  target: "offscreen";
};

export type GetRecordingTabIdMessage = {
  type: "recording-tab-id";
  target: "offscreen";
};

export function extractRecordingTabId(url: string): number | null {
  const offscreenUrl = new URL(url);
  const regex = /recording-(?<tabId>\d+)/;
  const tabId = regex.exec(offscreenUrl.hash)?.groups?.tabId;
  return tabId ? Number.parseInt(tabId, 10) : null;
}

export function isRecordErrorMessage(
  message: unknown,
): message is RecordErrorMessage {
  if (typeof message !== "object" || message == null) {
    return false;
  }

  return (
    "target" in message &&
    message.target === "offscreen-doc" &&
    "type" in message &&
    message.type === "record-error"
  );
}

export function isStartAudioCaptureMessage(
  message: unknown,
): message is StartAudioCaptureMessage {
  if (typeof message !== "object" || message == null) {
    return false;
  }

  return (
    "target" in message &&
    message.target === "offscreen" &&
    "type" in message &&
    message.type === "start-recording"
  );
}

export function isStopAudioCaptureMessage(
  message: unknown,
): message is StopAudioCaptureMessage {
  if (typeof message !== "object" || message == null) {
    return false;
  }

  return (
    "target" in message &&
    message.target === "offscreen" &&
    "type" in message &&
    message.type === "stop-recording"
  );
}

export function isGetRecordingTabIdMessage(
  message: unknown,
): message is GetRecordingTabIdMessage {
  if (typeof message !== "object" || message == null) {
    return false;
  }

  return (
    "target" in message &&
    message.target === "offscreen" &&
    "type" in message &&
    message.type === "recording-tab-id"
  );
}
