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

import { datadogRum } from "@datadog/browser-rum";
import { getDNT } from "@/telemetry/dnt";
import { getBaseURL } from "@/services/baseService";

const environment = process.env.ENVIRONMENT;
const applicationId = process.env.DATADOG_APPLICATION_ID;
const clientToken = process.env.DATADOG_CLIENT_TOKEN;

/**
 * Initialize Datadog Real User Monitoring (RUM) for performance monitoring.
 */
export async function initPerformanceMonitoring(): Promise<void> {
  const dnt = await getDNT();
  const baseUrl = await getBaseURL();

  if (dnt) {
    return;
  }

  if (!applicationId || !clientToken) {
    console.warn("Missing Datadog application ID or client token");
    return;
  }

  const { version_name } = browser.runtime.getManifest();

  datadogRum.init({
    applicationId,
    clientToken,
    site: "datadoghq.com",
    service: "pixiebrix-browser-extension",
    env: environment,
    version: version_name,
    sessionSampleRate: 100,
    sessionReplaySampleRate: 20,
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: "mask",
    // https://docs.datadoghq.com/real_user_monitoring/connect_rum_and_traces/?tab=browserrum#usage
    allowedTracingUrls: [baseUrl],
  });

  datadogRum.startSessionReplayRecording();
}
