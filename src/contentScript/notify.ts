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

import { merge } from "lodash";

export async function showNotification(
  message: string,
  className: "error" | "info" | "success"
): Promise<void> {
  $.notify(message, {
    className,
  });
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
  // Call getErrorMessage on err and include in the details
  $.notify(message, {
    className: "error",
  });
}

export function notifyResult(extensionId: string, config: MessageConfig): void {
  $.notify(config.message, config.config);
}

export function notifyProgress(
  extensionId: string,
  message: string
): NotificationCallbacks {
  const element = $.notify(message, {
    autoHide: false,
    clickToHide: false,
    className: "info",
  });

  return {
    hide: () => {
      $(element).trigger("notify-hide");
    },
  };
}
