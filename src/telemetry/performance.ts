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
import { expectContext, forbidContext } from "@/utils/expectContext";
import { flagOn, getUserData } from "@/auth/token";

const environment = process.env.ENVIRONMENT;
const applicationId = process.env.DATADOG_APPLICATION_ID;
const clientToken = process.env.DATADOG_CLIENT_TOKEN;

const RUM_FLAG = "telemetry-performance";

/**
 * Initialize Datadog Real User Monitoring (RUM) for performance monitoring.
 */
export async function initPerformanceMonitoring(): Promise<void> {
  expectContext("extension");
  forbidContext("contentScript");

  const baseUrl = await getBaseURL();

  if (await getDNT()) {
    return;
  }

  if (!(await flagOn(RUM_FLAG))) {
    return;
  }

  if (!applicationId || !clientToken) {
    console.warn("Datadog application ID or client token not configured");
    return;
  }

  const { version_name } = browser.runtime.getManifest();
  const { user: userId } = await getUserData();

  // https://docs.datadoghq.com/real_user_monitoring/browser/
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
    trackFrustrations: true,
    defaultPrivacyLevel: "mask",
    // To support in Page Editor and Sidebar because they're iframes
    useCrossSiteSessionCookie: true,
    // List the URLs/origins for sending trace headers
    // https://docs.datadoghq.com/real_user_monitoring/connect_rum_and_traces/?tab=browserrum#usage
    allowedTracingUrls: [baseUrl],
  });

  datadogRum.startSessionReplayRecording();

  // https://docs.datadoghq.com/real_user_monitoring/browser/modifying_data_and_context/?tab=npm#user-session
  datadogRum.setUser({
    id: userId,
  });
}
