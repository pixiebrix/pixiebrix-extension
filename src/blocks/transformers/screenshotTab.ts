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

import { Transformer } from "@/types";
import { Schema } from "@/core";
import { captureTab } from "@/background/messenger/api";
import { BusinessError, getErrorMessage } from "@/errors";

export class ScreenshotTab extends Transformer {
  constructor() {
    super(
      "@pixiebrix/browser/screenshot",
      "Screenshot Tab",
      "Take a screenshot/capture the visible area of the active tab"
    );
  }

  inputSchema: Schema = {
    type: "object",
    properties: {},
  };

  outputSchema: Schema = {
    type: "object",
    properties: {
      data: {
        type: "string",
        description: "The PNG screenshot as a data URI",
      },
    },
  };

  defaultOutputKey = "screenshot";

  async transform(): Promise<unknown> {
    try {
      return {
        data: await captureTab(),
      };
    } catch (error) {
      if (getErrorMessage(error).includes("activeTab")) {
        // Event if PixieBrix has access to a host, PixieBrix needs activeTab. So the user must have done one of the
        // following. https://developer.chrome.com/docs/extensions/mv3/manifest/activeTab/#invoking-activeTab. We'll
        // give an error message that ensures one of these must have been true:
        // - Executing an action
        // - Executing a context menu item
        // - Executing a keyboard shortcut from the commands API
        throw new BusinessError(
          "The Screenshot Tab brick can only be run from the context menu or sidebar of the active tab"
        );
      }

      throw error;
    }
  }
}
