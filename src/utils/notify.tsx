/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import React from "react";
import { render } from "react-dom";
import { toast, Toaster } from "react-hot-toast";
import { uuidv4 } from "@/types/helpers";
import { DefaultToastOptions } from "react-hot-toast/dist/core/types";
import { NOTIFICATIONS_Z_INDEX } from "@/common";
import reportError from "@/telemetry/reportError";
import { Except, RequireAtLeastOne } from "type-fest";
import { getErrorMessage } from "@/errors";

type NotificationType = "info" | "success" | "error" | "warning" | "loading";
interface Notification {
  message: string;
  type?: NotificationType;
  id?: string;
  duration?: number;
  error?: unknown;
  report?: boolean;
}

const containerStyle: React.CSSProperties = {
  zIndex: NOTIFICATIONS_Z_INDEX,
  fontFamily: "sans-serif",
};

const toastOptions: DefaultToastOptions = {
  // These colors match react-hot-toast’s status icons
  success: {
    style: {
      border: "solid 2px #61d345",
    },
  },
  error: {
    style: {
      border: "solid 2px #ff4b4b",
    },
  },
};

export function initToaster(): void {
  const root = document.createElement("div");
  // This style cannot be on containerStyle because it overrides some of its props there
  root.setAttribute("style", "all: initial");

  document.body.append(root);
  render(<Toaster {...{ containerStyle, toastOptions }} />, root);
}

export function showNotification({
  error,
  message,
  type = error ? "error" : undefined,
  id = uuidv4(),
  duration,
  report = false,
}: Notification): string {
  const options = { id, duration };
  switch (type) {
    case "error":
    case "success":
    case "loading":
      // eslint-disable-next-line security/detect-object-injection -- Filtered
      toast[type](message, options);
      break;

    default:
      toast(message, options);
  }

  if (type === "error" && report) {
    reportError(error ?? message);
  }

  return id;
}

export function hideNotification(id: string): void {
  toast.remove(id);
}

export const DEFAULT_ACTION_RESULTS = {
  error: {
    message: "Error running action",
    config: {
      className: "error",
    },
  },
  cancel: {
    message: "The action was cancelled",
    config: {
      className: "info",
    },
  },
  success: {
    message: "Successfully ran action",
    config: {
      className: "success",
    },
  },
};

export interface MessageConfig {
  message: string;
  config: Partial<NotificationOptions>;
}

/**
 * @example notifyError('User message')
 * @example notifyError({error: new Error('Error that can be shown to the user')})
 * @example notifyError({message: "User message", error: new Error('DetailedError'), id: 123})
 */
function notifyError(
  notification:
    | string
    | RequireAtLeastOne<Except<Notification, "type">, "message" | "error">
): string {
  if (typeof notification === "string") {
    notification = { message: notification };
  }

  return showNotification({
    ...notification,
    message: notification.message ?? getErrorMessage(notification.error),
    type: "error",
  });
}

function notifyInfo(
  notification: string | Except<Notification, "type">
): string {
  if (typeof notification === "string") {
    notification = { message: notification };
  }

  return showNotification({ ...notification, type: "info" });
}

function notifySuccess(
  notification: string | Except<Notification, "type">
): string {
  if (typeof notification === "string") {
    notification = { message: notification };
  }

  return showNotification({ ...notification, type: "success" });
}

export function notifyResult(
  extensionId: string,
  { message, config: { className } }: MessageConfig
): void {
  showNotification({ message, type: className as NotificationType });
}

const notify = {
  error: notifyError,
  info: notifyInfo,
  success: notifySuccess,
  warning: notifyError,
};

export default notify;
