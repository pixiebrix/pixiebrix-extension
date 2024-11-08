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

import { ping } from "@/background/messenger/api";
import { isContextInvalidatedError } from "@/errors/contextInvalidated";
import { isLoadedInIframe } from "../utils/iframeUtils";
import { getSettingsState } from "../store/settings/settingsStorage";

const PING_INTERVAL_MS = 5 * 1000;
const PING_WARNING_THRESHOLD_MS = 150;

/**
 * Timing results for a ping.
 */
interface PingTiming {
  /**
   * Time the ping was sent
   */
  timestamp: number;

  /**
   * Time for the background page to receive/start handling the message
   */
  sendMs: number;
  /**
   * Time for the content script to receive the response after handling the message
   */
  responseMs: number;
  /**
   * Total round trip time
   */
  totalMs: number;
}

/**
 * Performance diagnostics.
 */
interface Diagnostics {
  /**
   * True if performance monitoring is enabled in this frame.
   */
  isMonitoringEnabled: boolean;

  /**
   * Ping times that exceeded the warning threshold.
   * @see PING_WARNING_THRESHOLD_MS
   */
  pingWarnings: PingTiming[];
}

/**
 * True to enable performance monitoring in this frame.
 */
let isMonitoringEnabled = false;

/**
 * Pings that exceeded the warning threshold.
 * @see PING_WARNING_THRESHOLD_MS
 */
// eslint-disable-next-line local-rules/persistBackgroundData -- Unused there
const pingWarnings: PingTiming[] = [];

/**
 * Ping the background page to measure the latency of the runtime messaging.
 */
async function pingBackgroundPage(): Promise<void> {
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

  const data: PingTiming = {
    timestamp: startTimestamp,
    sendMs: receiveTimestamp - startTimestamp,
    responseMs: endTimestamp - receiveTimestamp,
    totalMs: duration,
  };

  log(`ping (ms): ${duration}`, data);

  if (duration > PING_WARNING_THRESHOLD_MS) {
    pingWarnings.push(data);
  }
}

/**
 * Returns content script performance diagnostics.
 *
 * @since 1.7.35
 */
export async function getDiagnostics(): Promise<Diagnostics> {
  return {
    isMonitoringEnabled,
    pingWarnings,
  };
}

/**
 * Initialize performance monitoring for the top-level frame, if performance tracing setting is enabled.
 */
export async function initPerformanceMonitoring(): Promise<void> {
  if (isLoadedInIframe()) {
    return;
  }

  const { performanceTracing } = await getSettingsState();

  if (!performanceTracing) {
    return;
  }

  isMonitoringEnabled = true;

  void pingBackgroundPage();

  setInterval(pingBackgroundPage, PING_INTERVAL_MS);
}
