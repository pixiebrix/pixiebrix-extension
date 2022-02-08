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

import { proxyService } from "@/background/messenger/api";
import { Effect } from "@/types";
import { BlockArg, Schema } from "@/core";
import { boolean } from "@/utils";

export class SendSimpleSlackMessage extends Effect {
  constructor() {
    super(
      "slack/simple-message",
      "[Deprecated] Send a Slack message via Incoming WebHook",
      "Send a Slack message via its Incoming WebHooks App"
    );
  }

  inputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    required: ["hookUrl", "text"],
    properties: {
      hookUrl: {
        type: "string",
        description: "The Incoming WebHooks application URL",
      },
      botName: {
        type: "string",
        description: "The bot name to show, or leave blank to use the default",
      },
      iconEmoji: {
        type: "string",
        description: "An icon emoji, e.g., :ghost:",
      },
      channel: {
        type: "string",
        description:
          "#channel, or @username, or leave blank to use the default",
      },
      text: {
        type: "string",
        description: "This is the text that will be posted to the channel",
      },
      unfurlLinks: {
        type: "boolean",
        description: "Unfurl links to primarily text-based content",
      },
    },
  };

  async effect({
    text,
    hookUrl,
    channel,
    iconEmoji,
    botName,
    unfurlLinks,
  }: BlockArg): Promise<void> {
    await proxyService(null, {
      url: hookUrl,
      method: "post",
      // https://stackoverflow.com/questions/45752537/slack-incoming-webhook-request-header-field-content-type-is-not-allowed-by-acce
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: {
        text,
        icon_emoji: iconEmoji,
        channel,
        username: botName,
        unfurl_links: boolean(unfurlLinks),
      },
    });
  }
}

export class SendAdvancedSlackMessage extends Effect {
  constructor() {
    super(
      "slack/advanced-message",
      "[Deprecated] Send a Slack richly-formatted message via WebHook with attachments",
      "Send a Slack richly-formatted message via its Incoming WebHooks App"
    );
  }

  inputSchema: Schema = {
    $schema: "https://json-schema.org/draft/2019-09/schema#",
    type: "object",
    required: ["hookUrl", "attachments"],
    properties: {
      hookUrl: {
        type: "string",
        description: "The Incoming WebHooks application URL",
      },
      botName: {
        type: "string",
        description: "The bot name to show, or leave blank to use the default",
      },
      iconEmoji: {
        type: "string",
        description: "An icon emoji, e.g., :ghost:",
      },
      channel: {
        type: "string",
        description:
          "#channel, or @username, or leave blank to use the default",
      },
      unfurlLinks: {
        type: "boolean",
        description: "Unfurl links to primarily text-based content",
      },
      attachments: {
        type: "array",
        items: {
          type: "object",
          required: ["fallback"],
          properties: {
            fallback: {
              type: "string",
              description:
                "Required text summary of the attachment that is shown by clients that understand attachments but choose not to show them.",
            },
            pretext: {
              type: "string",
              description:
                "Optional text that should appear above the formatted data",
            },
            color: {
              type: "string",
              description:
                "Can either be one of 'good', 'warning', 'danger', or any hex color code",
            },
            text: {
              type: "string",
              description:
                "Optional text that should appear within the attachment",
            },
            fields: {
              type: "array",
              description: "Fields are displayed in a table on the message",
              items: {
                type: "object",
                required: ["title"],
                properties: {
                  title: {
                    type: "string",
                    description:
                      "The title may not contain markup and will be escaped for you",
                  },
                  value: {
                    type: ["string", "null", "number"],
                    description:
                      "Text value of the field. May contain standard message markup and must be escaped as normal. May be multi-line.",
                  },
                  short: {
                    type: "boolean",
                    description:
                      "Flag indicating whether the `value` is short enough to be displayed side-by-side with other values",
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  async effect({
    text,
    hookUrl,
    channel,
    iconEmoji,
    botName,
    unfurlLinks,
    attachments,
  }: BlockArg): Promise<void> {
    if (!hookUrl) {
      throw new Error("hookUrl not configured");
    }

    await proxyService(null, {
      url: hookUrl,
      method: "post",
      // https://stackoverflow.com/questions/45752537/slack-incoming-webhook-request-header-field-content-type-is-not-allowed-by-acce
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: {
        text,
        icon_emoji: iconEmoji,
        channel,
        username: botName,
        unfurl_links: boolean(unfurlLinks),
        attachments,
      },
    });
  }
}
