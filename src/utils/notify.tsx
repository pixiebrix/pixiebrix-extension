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

import styles from "./notify.module.scss";

import React from "react";
import { toast, Toaster, type ToastOptions } from "react-hot-toast";
import { uuidv4 } from "@/types/helpers";
import { NOTIFICATIONS_Z_INDEX } from "@/domConstants";
import reportError from "@/telemetry/reportError";
import { type Except, type RequireAtLeastOne } from "type-fest";
import { getErrorMessage } from "@/errors/errorHelpers";
import { merge, truncate } from "lodash";
import ErrorIcon from "@/icons/error.svg?loadAsComponent";
import WarningIcon from "@/icons/warning.svg?loadAsComponent";
import type { Notification, NotificationType } from "@/utils/notificationTypes";
import { renderWidget } from "./reactUtils";

const MINIMUM_NOTIFICATION_DURATION_MS = 2000;

type SimpleNotification = string | Except<Notification, "type">;

type ToastStyle = Partial<Record<NotificationType, ToastOptions>>;

const Message: React.FunctionComponent<{
  title?: string;
  message: string;
  id: string;
  dismissable: boolean;
}> = ({ title, message, id, dismissable }) => (
  <>
    <div>
      {title ? <p className={styles.title}>{title}</p> : null}
      <p className={styles.message}>
        {message.split("\n").map((line, number) => (
          // eslint-disable-next-line react/no-array-index-key -- Will not be updated
          <div key={number}>{line}</div>
        ))}
      </p>
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
    ) : null}
  </>
);

const getIcon = (
  Icon: React.FC<React.SVGProps<SVGSVGElement>>,
  color: string,
) => <Icon style={{ height: 24, color, flex: "0 0 24px" }} />;

// Override for built-in toasts
// These colors match react-hot-toast’s status icons
// eslint-disable-next-line local-rules/persistBackgroundData -- Static
const toastOptions: ToastStyle = {
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

// eslint-disable-next-line local-rules/persistBackgroundData -- Static
const containerStyle = {
  zIndex: NOTIFICATIONS_Z_INDEX,
  fontFamily: "sans-serif",
} satisfies React.CSSProperties;

function getMessageDisplayTimeMs(message: string): number {
  const wpm = 100; // 180 is the average words read per minute, make it slower
  return Math.max(
    MINIMUM_NOTIFICATION_DURATION_MS,
    (message.split(" ").length / wpm) * 60_000,
  );
}

export function initToaster(): void {
  renderWidget({
    name: "notifications",
    // We want to keep the notifications on the page because they might
    // inform the user of the context invalidation.
    // In the future we might want to still drop the widget after a minute or so.
    keepAfterInvalidation: true,
    widget: <Toaster {...{ containerStyle, toastOptions }} />,
  });
}

export function showNotification({
  error,
  includeErrorDetails = true,
  title,
  message,
  type = error ? "error" : undefined,
  id = uuidv4(),
  autoDismissTimeMs: duration,
  dismissable = true,
  position = "top-center",
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

  duration ??= getMessageDisplayTimeMs(message);

  const options: ToastOptions = {
    id,
    duration,
    position,
  };
  const component = (
    <Message
      id={id}
      title={title}
      message={message}
      dismissable={dismissable}
    />
  );

  switch (type) {
    case "error":
    case "success":
    case "loading": {
      // eslint-disable-next-line security/detect-object-injection -- Filtered
      toast[type](component, options);
      break;
    }

    case "warning": {
      // eslint-disable-next-line security/detect-object-injection -- Filtered
      toast(component, merge(options, toastOptions[type]));
      break;
    }

    default: {
      toast(component, options);
    }
  }

  if (willReport) {
    reportError(error ?? message);
  }

  return id;
}

export function hideNotification(id: string): void {
  toast.remove(id);
}

export interface MessageConfig {
  message: string;
  type: NotificationType;
}

// Private method to prevent adding logic to the `notify.*` helpers.
// Always add logic to `showNotification` instead so it's in one place.
function _show(
  type: NotificationType,
  notification: string | Except<Notification, "type">,
): string {
  if (typeof notification === "string") {
    notification = { message: notification };
  }

  return showNotification({ ...notification, type });
}

// Please only add logic to `showNotification`
// eslint-disable-next-line local-rules/persistBackgroundData -- Functions
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
