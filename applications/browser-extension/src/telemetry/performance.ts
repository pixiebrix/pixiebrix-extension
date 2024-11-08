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

import { datadogRum } from "@datadog/browser-rum";
import { getDNT } from "@/telemetry/dnt";
import { getBaseURL } from "@/data/service/baseService";
import { forbidContext } from "@/utils/expectContext";
import { addAuthListener, readAuthData } from "@/auth/authStorage";
import {
  cleanDatadogVersionName,
  mapAppUserToTelemetryUser,
} from "@/telemetry/telemetryHelpers";
import type { UserData } from "@/auth/authTypes";
import { flagOn } from "@/auth/featureFlagStorage";
import { FeatureFlags } from "@/auth/featureFlags";

/**
 * Initialize Datadog Real User Monitoring (RUM) for performance monitoring. This should be called once per page load, before
 * any user interactions or network requests are made.
 *
 * @param sessionReplaySampleRate The percentage of sessions to record for session replay. Default is 20%.
 * @param additionalGlobalContext Additional global context to include with all RUM events.
 */
export async function initPerformanceMonitoring({
  sessionReplaySampleRate = 20,
  additionalGlobalContext = {},
}: {
  sessionReplaySampleRate?: number;
  additionalGlobalContext?: UnknownObject;
} = {}): Promise<void> {
  const environment = process.env.ENVIRONMENT;
  const applicationId = process.env.DATADOG_APPLICATION_ID;
  const clientToken = process.env.DATADOG_CLIENT_TOKEN;

  // We don't want to track performance of the host sites
  forbidContext("web"); // Includes the content script

  // There's no user interactions to track in the background page
  forbidContext("background");

  if (await getDNT()) {
    return;
  }

  if (!(await flagOn(FeatureFlags.RUM_SESSION_RECORDING))) {
    return;
  }

  const { version_name } = browser.runtime.getManifest();

  if (!applicationId || !clientToken || !version_name || !environment) {
    console.warn(
      "Required environment variables for initializing Datadog missing:",
      {
        applicationId: Boolean(applicationId),
        clientToken: Boolean(clientToken),
        version_name,
        environment,
      },
    );
    return;
  }

  const baseUrl = await getBaseURL();

  // https://docs.datadoghq.com/real_user_monitoring/browser/
  datadogRum.init({
    applicationId,
    clientToken,
    site: "datadoghq.com",
    service: "pixiebrix-browser-extension",
    env: environment,
    version: cleanDatadogVersionName(version_name),
    sessionSampleRate: 100,
    sessionReplaySampleRate,
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: "mask",
    // From the docs, it would appear that useCrossSiteSessionCookie would enable support for iframes like the
    // sidebar and page editor. But in reality, it breaks the Extension Console tracking too.
    // To support in Page Editor and Sidebar because they're iframes
    // useCrossSiteSessionCookie: true,
    // List the URLs/origins for sending trace headers
    // https://docs.datadoghq.com/real_user_monitoring/connect_rum_and_traces/?tab=browserrum#usage
    allowedTracingUrls: [baseUrl],

    // https://github.com/DataDog/browser-sdk/issues/798
    // https://docs.datadoghq.com/real_user_monitoring/guide/monitor-electron-applications-using-browser-sdk/
    allowFallbackToLocalStorage: true,
  });

  datadogRum.setGlobalContext({
    code_version: process.env.SOURCE_VERSION,
    ...additionalGlobalContext,
  });

  // https://docs.datadoghq.com/real_user_monitoring/browser/modifying_data_and_context/?tab=npm#user-session
  datadogRum.setUser(await mapAppUserToTelemetryUser(await readAuthData()));

  // NOTE: Datadog does not document this well, but when a rum session was already started for the
  //   user (say from the extension console page), initializing datadogRum again will not reuse the
  //   same session replay setting. Thus, if the initial session did not start a replay recording, any subsequent
  //   datadogRum.init calls will not start the session replay, even if the sessionReplaySampleRate is 100.
  //   Thus as a work-around, we call startSessionReplayRecording here with force: true to ensure that the session replay is started.
  //   See: https://github.com/DataDog/browser-sdk/issues/1967
  if (sessionReplaySampleRate === 100) {
    console.debug("Forcing session replay recording");
    datadogRum.startSessionReplayRecording({
      force: true,
    });
  }

  addAuthListener(updatePerson);
}

async function updatePerson(data: UserData): Promise<void> {
  const person = await mapAppUserToTelemetryUser(data);

  console.debug("Setting error telemetry user", person);

  // https://docs.datadoghq.com/real_user_monitoring/browser/modifying_data_and_context/?tab=npm#user-session
  datadogRum.setUser(person);
}
