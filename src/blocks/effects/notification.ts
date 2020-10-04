import { Effect } from "@/types";
import { faStickyNote } from "@fortawesome/free-solid-svg-icons";
import { registerBlock } from "@/blocks/registry";
import { PERMISSIONS_NOTIFICATIONS } from "@/permissions/optional";
import { sendNotification } from "@/chrome";
import { propertiesToSchema } from "@/validators/generic";
import { BlockArg, Schema } from "@/core";

export class ShowNotificationEffect extends Effect {
  constructor() {
    super(
      "@pixiebrix/system/notification",
      "System Notification",
      "Show a system notification",
      faStickyNote
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

  async effect({ title, message }: BlockArg) {
    const { id } = await sendNotification({
      type: "basic",
      title,
      message,
      iconUrl: "icons/logo48.png",
    });
    console.debug("Sent chrome notification", { id });
  }
}

registerBlock(new ShowNotificationEffect());
