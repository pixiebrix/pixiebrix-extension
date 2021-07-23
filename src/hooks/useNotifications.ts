/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { useToasts } from "react-toast-notifications";
import { useCallback, useMemo } from "react";
import { reportError } from "@/telemetry/logging";
import { getErrorMessage } from "@/errors";

type ErrorNotificationOptions = {
  /**
   * True to report the error to Rollbar.
   */
  report?: boolean;

  /**
   * True to autoDismiss the notification.
   */
  autoDismiss?: boolean;

  /**
   * If provided, this error will be provided to Rollbar instead of
   */
  error?: unknown;
};

type Notifications = {
  success: (content: string) => void;
  info: (content: string) => void;
  warning: (content: string, options?: ErrorNotificationOptions) => void;
  error: (content: unknown, options?: ErrorNotificationOptions) => void;
};

/**
 * A hook that simplifies reporting notifications to users and error telemetry
 */
function useNotifications(): Notifications {
  const { addToast } = useToasts();

  const notifySuccess = useCallback(
    (content: string) => {
      addToast(content, {
        appearance: "success",
        autoDismiss: true,
      });
    },
    [addToast]
  );

  const notifyInfo = useCallback(
    (content: string) => {
      addToast(content, {
        appearance: "info",
        autoDismiss: true,
      });
    },
    [addToast]
  );

  const notifyWarning = useCallback(
    (content: string, options: ErrorNotificationOptions = {}) => {
      const { report, autoDismiss, error } = {
        report: false,
        autoDismiss: true,
        ...options,
      };
      if (report) {
        reportError(error ?? content);
      }
      addToast(content, {
        appearance: "warning",
        autoDismiss,
      });
    },
    [addToast]
  );

  const notifyError = useCallback(
    (content: unknown, options: ErrorNotificationOptions = {}) => {
      const { report, autoDismiss, error } = {
        report: true,
        autoDismiss: true,
        ...options,
      };
      if (report) {
        reportError(error ?? content);
      }
      addToast(getErrorMessage(content ?? "Unknown Error"), {
        appearance: "error",
        autoDismiss,
      });
    },
    [addToast]
  );

  // Memoize the object so callers can use root value in the dependency
  return useMemo(
    () => ({
      error: notifyError,
      info: notifyInfo,
      success: notifySuccess,
      warning: notifyWarning,
    }),
    [notifyError, notifyInfo, notifyWarning, notifySuccess]
  );
}

export default useNotifications;
