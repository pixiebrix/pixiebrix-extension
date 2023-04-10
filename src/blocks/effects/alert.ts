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

import { propertiesToSchema } from "@/validators/generic";
import { showNotification } from "@/utils/notify";
import { validateRegistryId } from "@/types/helpers";
import { type Schema } from "@/types/schemaTypes";
import { type BlockArgs } from "@/types/runtimeTypes";
import { Effect } from "@/types/blocks/effectTypes";

export const ALERT_EFFECT_ID = validateRegistryId("@pixiebrix/browser/alert");

export const ALERT_PERSISTENT_OPTION = "window";

export class AlertEffect extends Effect {
  constructor() {
    super(
      ALERT_EFFECT_ID,
      "Window Alert",
      "Show an alert/notification in the browser window"
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
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
    },
    ["message", "type"]
  );

  async effect({
    message,
    type = "window",
    duration = Number.POSITIVE_INFINITY,
  }: BlockArgs<{
    message: string | number | boolean;
    type: "window" | "info" | "success" | "warning" | "error";
    duration?: number;
  }>): Promise<void> {
    const messageString = String(message);

    if (type === "window") {
      // eslint-disable-next-line no-alert
      window.alert(messageString);
    } else {
      showNotification({
        message: messageString,
        type,
        duration,
        reportError: false,
      });
    }
  }
}
