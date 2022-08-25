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

import styles from "./notify.module.scss";

import React from "react";
import { render } from "react-dom";
import {
  toast,
  Toaster,
  DefaultToastOptions,
  ToastOptions,
} from "react-hot-toast";
import { uuidv4 } from "@/types/helpers";
import { NOTIFICATIONS_Z_INDEX } from "@/common";
import reportError from "@/telemetry/reportError";
import { Except, RequireAtLeastOne } from "type-fest";
import { getErrorMessage } from "@/errors/errorHelpers";
import { merge, truncate } from "lodash";
import { SIDEBAR_WIDTH_CSS_PROPERTY } from "@/contentScript/sidebarDomControllerLite";
import ErrorIcon from "@/icons/error.svg?loadAsComponent";
import WarningIcon from "@/icons/warning.svg?loadAsComponent";

const MINIMUM_NOTIFICATION_DURATION = 2000;

export type NotificationType =
  | "info"
  | "success"
  | "error"
  | "warning"
  | "loading";
type Notification = RequireAtLeastOne<
  {
    message: string;
    type?: NotificationType;
    id?: string;
    duration?: number;
    error: unknown;
    dismissable?: boolean;
    reportError?: boolean;
    includeErrorDetails?: boolean;
  },
  "message" | "error"
>;

type SimpleNotification = string | Except<Notification, "type">;

type ToastStyle = Partial<Record<NotificationType, ToastOptions>>;

const Message: React.FunctionComponent<{
  message: string;
  id: string;
  dismissable: boolean;
}> = ({ message, id, dismissable }) => (
  <>
    <div className={styles.message}>
      {message.split("\n").map((line, number) => (
        <div key={number}>{line}</div>
      ))}
    </div>
    {dismissable ? (
      <button
        className={styles.closeButton}
        onClick={() => {
          toast.dismiss(id);
        }}
      >
        ×
      </button>
    ) : undefined}
  </>
);

const getIcon = (
  Icon: React.FC<React.SVGProps<SVGSVGElement>>,
  color: string
) => <Icon style={{ height: 24, color, flex: "0 0 24px" }} />;

const toastStyle: ToastStyle = {
  success: {
    style: {
      border: "solid 2px #61d345",
    },
  },
  warning: {
    icon: getIcon(WarningIcon, "#e89c00"),
    style: {
      border: "solid 2px #e89c00",
    },
  },
  error: {
    icon: getIcon(ErrorIcon, "#e84e2c"),
    style: {
      border: "solid 2px #e84e2c",
    },
  },
};

function getMessageDisplayTime(message: string): number {
  const wpm = 100; // 180 is the average words read per minute, make it slower
  return Math.max(
    MINIMUM_NOTIFICATION_DURATION,
    (message.split(" ").length / wpm) * 60_000
  );
}

export function initToaster(): void {
  const root = document.createElement("div");
  // This style cannot be on containerStyle because it overrides some of its props there
  root.setAttribute("style", "all: initial");

  document.body.append(root);

  const containerStyle: React.CSSProperties = {
    zIndex: NOTIFICATIONS_Z_INDEX,
    fontFamily: "sans-serif",
  };

  // Override for built-in toasts
  const toastOptions: DefaultToastOptions = {
    // These colors match react-hot-toast’s status icons
    success: toastStyle.success,
    error: toastStyle.error,
  };
  render(<Toaster {...{ containerStyle, toastOptions }} />, root);
}

export function showNotification({
  error,
  includeErrorDetails = true,
  message,
  type = error ? "error" : undefined,
  id = uuidv4(),
  duration,
  dismissable = true,

  /** Only errors are reported by default */
  reportError: willReport = type === "error",
}: RequireAtLeastOne<Notification, "message" | "error">): string {
  if (error) {
    if (!message) {
      message = getErrorMessage(error);
    } else if (includeErrorDetails) {
      message += "\n" + getErrorMessage(error);
    }
  }

  // Avoid excessively-long notification messages
  message = truncate(message, { length: 400 });

  duration ??= getMessageDisplayTime(message);

  const options: ToastOptions = {
    id,
    duration,
    // Keep the notification centered on the document even when the sidebar is open
    style: { marginLeft: `calc(var(${SIDEBAR_WIDTH_CSS_PROPERTY}, 0) * -1)` },
  };
  const component = <Message {...{ message, id, dismissable }} />;

  switch (type) {
    case "error":
    case "success":
    case "loading":
      // eslint-disable-next-line security/detect-object-injection -- Filtered
      toast[type](component, options);
      break;

    case "warning":
      // eslint-disable-next-line security/detect-object-injection -- Filtered
      toast(component, merge(options, toastStyle[type]));
      break;

    default:
      toast(component, options);
  }

  if (willReport) {
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
    type: "error",
    reportError: false,
  },
  cancel: {
    message: "The action was cancelled",
    type: "info",
  },
  success: {
    message: "Successfully ran action",
    type: "success",
  },
} as const;

export interface MessageConfig {
  message: string;
  type: NotificationType;
}

// Private method to prevent adding logic to the `notify.*` helpers.
// Always add logic to `showNotification` instead so it's in one place.
function _show(
  type: NotificationType,
  notification: string | Except<Notification, "type">
): string {
  if (typeof notification === "string") {
    notification = { message: notification };
  }

  return showNotification({ ...notification, type });
}

// Please only add logic to `showNotification`
const notify = {
  /**
   * @example notify.error('User message')
   * @example notify.error({error: new Error('Error that can be shown to the user')})
   * @example notify.error({message: "User message", error: new Error('DetailedError'), id: 123})
   */
  error: (notification: SimpleNotification) => _show("error", notification),
  info: (notification: SimpleNotification) => _show("info", notification),
  success: (notification: SimpleNotification) => _show("success", notification),
  warning: (notification: SimpleNotification) => _show("warning", notification),
} as const;

export default notify;
