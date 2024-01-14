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

import { isContentScript } from "webext-detect-page";
import { addListener as addAuthListener } from "@/auth/token";
import type { UserData } from "@/auth/authTypes";
import { getUID } from "@/background/messenger/api";
import pMemoize from "p-memoize";
import { datadogLogs } from "@datadog/browser-logs";
import type { Nullishable } from "@/utils/nullishUtils";
import type { UnknownObject } from "@/types/objectTypes";
import type { LogsEvent } from "@datadog/browser-logs/src/logsEvent.types";

// eslint-disable-next-line prefer-destructuring -- process.env
const ENVIRONMENT = process.env.ENVIRONMENT;
const APPLICATION_ID = process.env.DATADOG_APPLICATION_ID;
const CLIENT_TOKEN = process.env.DATADOG_CLIENT_TOKEN;

const IGNORED_MESSAGES = [/ResizeObserver loop/];

/**
 * The PixieBrix Person model for application error telemetry.
 */
type Person = {
  id: string;
  organizationId: string;
  email?: string;
};

interface ErrorReporter {
  error(args: {
    message: string;
    error: Error;
    messageContext: UnknownObject;
  }): void;
}

/**
 * https://docs.datadoghq.com/real_user_monitoring/browser/collecting_browser_errors/?tab=npm
 */
async function initErrorReporter(): Promise<Nullishable<ErrorReporter>> {
  // `async` to fetch person information from localStorage

  if (isContentScript()) {
    // The contentScript cannot not make requests directly to Rollbar because the site's CSP might not support it
    console.warn("Unsupported call to initErrorReporter in the contentScript");
  }

  if (!CLIENT_TOKEN || !APPLICATION_ID) {
    console.debug(
      "Error telemetry client token missing, errors won't be reported",
    );
    return undefined;
  }

  console.debug("Initializing error telemetry");

  try {
    addAuthListener(updatePerson);

    // NOTE: we aren't passing ignoredMessages, because we are applying our own filtering in reportUncaughtErrors and
    // reportError
    // https://docs.rollbar.com/docs/reduce-noisy-javascript-errors#ignore-certain-types-of-messages
    //
    // @since 1.7.40 - We need to hard-filter out the ResizeObserver loop errors because they are flooding Rollbar

    const { version_name } = browser.runtime.getManifest();

    datadogLogs.init({
      clientToken: CLIENT_TOKEN,
      service: "pixiebrix-browser-extension",
      env: ENVIRONMENT,
      version: version_name,
      site: "datadoghq.com",
      // NOTE: we are excluding captureUncaught and captureUnhandledRejections because we set our own handlers for that in
      // reportUncaughtErrors. The default for Datadog is true
      // https://docs.rollbar.com/docs/rollbarjs-configuration-reference#:~:text=captureEmail-,captureUncaught,-This%20determines%20whether
      forwardErrorsToLogs: false,
      // Record all sessions because it's error telemetry
      sessionSampleRate: 100,
      // Opt-out of Datadog's own SDK telemetry
      telemetrySampleRate: 0,
      // https://docs.datadoghq.com/logs/log_collection/javascript/#scrub-sensitive-data-from-your-browser-logs
      beforeSend(event: LogsEvent): Nullishable<boolean> {
        if (
          IGNORED_MESSAGES.some((ignoredMessage) =>
            ignoredMessage.test(event.message),
          )
        ) {
          return false;
        }

        // Patch to match the host in the public source maps
        event.error.stack.replaceAll(
          // Include the slash because location.origin does not have a trailing slash but the ENV does
          location.origin + "/",
          process.env.SOURCE_MAP_PUBLIC_PATH,
        );

        console.debug("Sending error telemetry to Datadog", { event });

        // Report event
        return true;
      },
    });

    return {
      error({ message, error, messageContext }) {
        // https://docs.datadoghq.com/real_user_monitoring/browser/collecting_browser_errors/?tab=npm#custom-error-handling
        datadogLogs.logger.error(message, messageContext, error);
      },
    };
  } catch (error) {
    console.error("Error during error report init", { error });
  }
}

async function personFactory(data: Partial<UserData>): Promise<Person> {
  const browserId = await getUID();

  const { user, email, telemetryOrganizationId, organizationId } = data;

  const errorOrganizationId = telemetryOrganizationId ?? organizationId;

  return errorOrganizationId
    ? {
        id: user,
        email,
        organizationId: errorOrganizationId,
      }
    : {
        id: browserId,
        organizationId: null,
      };
}

// OK to memoize. The addAuthListener will modify the Rollbar instance in place
// As of pMemoize 7.0.0, pMemoize does not cache rejections by default
// https://github-redirect.dependabot.com/sindresorhus/p-memoize/pull/48
export const getErrorReporter = pMemoize(initErrorReporter);

async function updatePerson(data: Partial<UserData>): Promise<void> {
  const person = await personFactory(data);

  console.debug("Setting error telemetry user", person);

  // https://docs.datadoghq.com/real_user_monitoring/browser/modifying_data_and_context/?tab=npm#user-session
  datadogLogs.setUser(person);
}
