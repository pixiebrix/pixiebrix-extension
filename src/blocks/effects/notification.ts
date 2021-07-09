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
import { registerBlock } from "@/blocks/registry";
import { PERMISSIONS_NOTIFICATIONS } from "@/permissions/optional";
import { createNotification } from "@/background/notifications";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg, Schema } from "@/core";

export class ShowNotificationEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/system/notification",
      "System Notification",
      "Show a system notification",
      "faStickyNote"
    );
  }

  inputSchema: Schema = propertiesToSchema({
    title: {
      type: "string",
      description: "Title of the notification (e.g. sender name for email).",
    },
    message: {
      type: "string",
      description: "Main notification content.",
    },
    // contextMessage: {
    //   type: "string",
    //   description: "Alternate notification content with a lower-weight font.",
    // },
  });

  permissions = PERMISSIONS_NOTIFICATIONS;

  async effect({ title, message }: BlockArg): Promise<void> {
    const id = await createNotification({
      type: "basic",
      title,
      message,
      iconUrl: "icons/logo48.png",
    });
    console.debug("Sent chrome notification", { id });
  }
}

registerBlock(new ShowNotificationEffect());
