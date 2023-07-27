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

import { ping } from "@/background/messenger/api";
import { isContextInvalidatedError } from "@/errors/contextInvalidated";
import { isLoadedInIframe } from "@/iframeUtils";

const PING_INTERVAL_MS = 5 * 1000;
const PING_WARNING_THRESHOLD_MS = 150;

/**
 * Ping the background page to measure the latency of the runtime messaging.
 */
async function pingBackgroundPage() {
  const startTimestamp = Date.now();

  let response;

  try {
    response = await ping();
  } catch (error) {
    if (isContextInvalidatedError(error)) {
      console.debug("ping: context invalidated");
      return;
    }

    console.warn("ping: error", error);
    return;
  }

  const { timestamp: receiveTimestamp } = response;

  const endTimestamp = Date.now();

  const duration = endTimestamp - startTimestamp;

  const log =
    duration > PING_WARNING_THRESHOLD_MS ? console.warn : console.debug;

  log(`ping (ms): ${endTimestamp - startTimestamp}`, {
    // Time for the background page to receive/start handling the message
    sendMs: receiveTimestamp - startTimestamp,
    // Time for the content script to receive the response after handling the message
    responseMs: endTimestamp - receiveTimestamp,
    // Total time
    totalMs: endTimestamp - startTimestamp,
  });
}

/**
 * Initialize performance monitoring for the top level frame, if performance monitoring is turned on.
 */
export function initPerformanceMonitoring(): void {
  if (isLoadedInIframe()) {
    return;
  }

  void pingBackgroundPage();

  setInterval(pingBackgroundPage, PING_INTERVAL_MS);
}
