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

import { Effect } from "@/types";
import { BlockArg, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { showNotification } from "@/contentScript/notify";

export class AlertEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/browser/alert",
      "Window Alert",
      "Show an alert/notification in the browser window"
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      message: {
        type: ["string", "number", "boolean"],
        description: "The text/value you want to display in the alert",
      },
      type: {
        type: "string",
        description:
          "The alert type/style. 'window' uses the browser's native window alert dialog, which the user must dismiss",
        enum: ["window", "info", "success", "error"],
        default: "info",
      },
      duration: {
        type: "number",
        description:
          "Duration to show the alert, in milliseconds. Ignored for 'window' alerts",
        default: 2500,
      },
    },
    ["message"]
  );

  async effect({
    message,
    type = "window",
    duration = Number.POSITIVE_INFINITY,
  }: BlockArg): Promise<void> {
    const messageString = String(message);

    if (type === "window") {
      // eslint-disable-next-line no-alert
      window.alert(messageString);
    } else {
      showNotification({ message: messageString, type, duration });
    }
  }
}
