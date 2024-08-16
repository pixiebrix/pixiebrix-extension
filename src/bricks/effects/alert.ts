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

import { validateRegistryId } from "@/types/helpers";
import type { BrickArgs, BrickOptions } from "@/types/runtimeTypes";
import { EffectABC } from "@/types/bricks/effectTypes";
import type { PlatformCapability } from "@/platform/capabilities";
import { propertiesToSchema } from "@/utils/schemaUtils";
import { type NotificationPosition } from "@/utils/notificationTypes";

export const ALERT_EFFECT_ID = validateRegistryId("@pixiebrix/browser/alert");

export const ALERT_PERSISTENT_OPTION = "window";

export class AlertEffect extends EffectABC {
  constructor() {
    super(
      ALERT_EFFECT_ID,
      "Window Alert",
      "Show an alert/notification in the browser window",
    );
  }

  inputSchema = propertiesToSchema(
    {
      title: {
        title: "Alert title",
        type: "string",
        description: "The title of the alert",
      },
      message: {
        title: "Alert message",
        type: ["string", "number", "boolean"],
        description: "The message or value you want to display in the alert",
      },
      type: {
        title: "Alert type",
        type: "string",
        description:
          'The alert type represents different scenarios for your message. "window" alerts stay on the screen until the user dismisses them',
        enum: ["window", "info", "success", "warning", "error"],
        default: "info",
      },
      duration: {
        title: "Alert duration",
        type: "number",
        description:
          "How long, in milliseconds, the alert remains before disappearing",
        default: 2500,
      },
      position: {
        title: "Alert position",
        type: "string",
        description: "The position of the alert on the screen",
        enum: [
          "top-left",
          "top-center",
          "top-right",
          "bottom-left",
          "bottom-center",
          "bottom-right",
        ],
        default: "top-center",
      },
    },
    ["message"],
  );

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    // In the future, dynamically determine based off type if type is statically known
    return ["alert", "toast"];
  }

  async effect(
    {
      title,
      message,
      type = "window",
      duration = Number.POSITIVE_INFINITY,
      position = "top-center",
    }: BrickArgs<{
      title?: string;
      message: string | number | boolean;
      type: "window" | "info" | "success" | "warning" | "error";
      position: NotificationPosition;
      duration?: number;
    }>,
    { platform }: BrickOptions,
  ): Promise<void> {
    const messageString = String(message);

    if (type === "window") {
      platform.alert(messageString);
    } else {
      platform.toasts.showNotification({
        title,
        message: messageString,
        type,
        autoDismissTimeMs: duration,
        position,
        reportError: false,
      });
    }
  }
}
