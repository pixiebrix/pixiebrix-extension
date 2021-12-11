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

import React from "react";
import { merge } from "lodash";
import { render } from "react-dom";
import { toast, Toaster } from "react-hot-toast";
import { uuidv4 } from "@/types/helpers";

type NotificationType = "info" | "success" | "error" | "loading";
interface Notification {
  message: string;
  type?: NotificationType;
  id?: string;
  duration?: number;
}

const containerStyle: React.CSSProperties = {
  zIndex: 9_999_999,
  fontFamily: "sans-serif",
};

export function initToaster(): void {
  const root = document.createElement("div");
  // This style cannot be on containerStyle because it overrides some of its props there
  root.setAttribute("style", "all: initial");

  document.body.append(root);
  render(<Toaster containerStyle={containerStyle} />, root);
}

export function showNotification({
  message,
  type,
  id = uuidv4(),
  duration,
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
  detail?: string;
  config: Partial<NotificationOptions>;
}

export function mergeConfig(
  custom: MessageConfig | null,
  defaults: MessageConfig
): MessageConfig {
  if (custom == null) {
    return defaults;
  }

  return merge({}, defaults, custom);
}

export interface NotificationCallbacks {
  hide: () => void;
}

export function notifyError(message: string): void {
  showNotification({ message, type: "error" });
}

export function notifyResult(
  extensionId: string,
  { message, config: { className } }: MessageConfig
): void {
  showNotification({ message, type: className as NotificationType });
}
