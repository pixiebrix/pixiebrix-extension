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

import { Effect } from "@/types";
import { BlockArg, Schema } from "@/core";
import { propertiesToSchema } from "@/validators/generic";
import { showNotification } from "@/contentScript/notify";

export class AlertEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/browser/alert",
      "Window Alert",
      "Show an alert in the window"
    );
  }

  inputSchema: Schema = propertiesToSchema(
    {
      message: {
        type: ["string", "number", "boolean"],
        description: "A string you want to display in the alert",
      },
      type: {
        type: "string",
        description:
          "The alert type/style. Browser uses the browser's native alert dialog, which requires the user to dismiss the dialog",
        enum: ["browser", "info", "success", "error"],
        default: "info",
      },
      duration: {
        type: "number",
        description:
          "Duration to show the alert, in milliseconds. Ignored for browser alerts",
        default: 2500,
      },
    },
    ["message"]
  );

  async effect({
    message,
    type = "browser",
    duration = Number.POSITIVE_INFINITY,
  }: BlockArg): Promise<void> {
    const messageString = String(message);

    if (type === "browser") {
      // eslint-disable-next-line no-alert
      window.alert(messageString);
    } else {
      showNotification({ message: messageString, type, duration });
    }
  }
}
