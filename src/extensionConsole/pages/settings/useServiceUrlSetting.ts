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

import { uuidv4 } from "@/types/helpers";
import { useConfiguredHost } from "@/data/service/baseService";
import { useCallback } from "react";
import { assertProtocolUrl } from "@/utils/urlUtils";
import notify from "@/utils/notify";
import pTimeout from "p-timeout";

const SAVING_URL_NOTIFICATION_ID = uuidv4();
const SAVING_URL_TIMEOUT_MS = 4000;

/**
 * Hook to validate and update the user-configured PixieBrix service URL setting.
 */
function useServiceUrlSetting(): [string, (value: string) => Promise<void>] {
  const [serviceUrl, setServiceUrl] = useConfiguredHost();

  // XXX: consider using useUserAction instead of useCallback.
  // Is using the same SAVING_URL_NOTIFICATION_ID really necessary?
  const validateAndSetServiceUrl = useCallback(
    async (value: string) => {
      const newPixiebrixUrl = value.trim();
      console.debug("Update service URL", { newPixiebrixUrl, serviceUrl });

      try {
        // Ensure it's a valid URL
        if (newPixiebrixUrl) {
          assertProtocolUrl(newPixiebrixUrl, ["https:"]);
        }
      } catch (error) {
        notify.error({
          id: SAVING_URL_NOTIFICATION_ID,
          error,
          reportError: false,
        });
        return;
      }

      try {
        if (newPixiebrixUrl) {
          // Ensure the new URL is connectable
          const response = await pTimeout(
            fetch(new URL("api/me", newPixiebrixUrl).href),
            { milliseconds: SAVING_URL_TIMEOUT_MS },
          );

          // Ensure it returns a JSON response. It's just `{}` when the user is logged out.
          await response.json();
        }
      } catch {
        notify.error({
          id: SAVING_URL_NOTIFICATION_ID,
          message: "The URL does not appear to point to a PixieBrix server",
          reportError: false,
        });
        return;
      }

      await setServiceUrl(newPixiebrixUrl);
      notify.success({
        id: SAVING_URL_NOTIFICATION_ID,
        message: "Service URL updated. You must reload the browser extension",
        dismissable: false,
        autoDismissTimeMs: Number.POSITIVE_INFINITY,
      });
    },
    [serviceUrl, setServiceUrl],
  );

  return [serviceUrl, validateAndSetServiceUrl] as const;
}

export default useServiceUrlSetting;
