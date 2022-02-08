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

type NotificationType = "info" | "success" | "error" | "loading";
interface Notification {
  message: string;
  type?: NotificationType;
  id?: string;
  duration?: number;
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

function getMessageDisplayTime(message: string): number {
  const wpm = 100; // 180 is the average words read per minute, make it slower
  return (message.split(" ").length / wpm) * 60_000;
}

export function initToaster(): void {
  const root = document.createElement("div");
  // This style cannot be on containerStyle because it overrides some of its props there
  root.setAttribute("style", "all: initial");

  document.body.append(root);
  render(<Toaster {...{ containerStyle, toastOptions }} />, root);
}

export function showNotification({
  message,
  type,
  id = uuidv4(),
  duration = getMessageDisplayTime(message),
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
  config: Partial<NotificationOptions>;
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
