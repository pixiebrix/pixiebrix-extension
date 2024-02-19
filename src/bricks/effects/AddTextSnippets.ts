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
import { propertiesToSchema } from "@/validators/generic";
import type { BrickArgs, BrickOptions } from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { EffectABC } from "@/types/bricks/effectTypes";
import {
  commandRegistry,
  initCommandController,
} from "@/contentScript/commandPopover/commandController";
import { getSettingsState } from "@/store/settings/settingsStorage";

type Snippet = {
  /**
   * The shortcut for the text command.
   */
  shortcut: string;
  /**
   * The title for the Text Command
   */
  title: string;
  /**
   * The text to insert
   */
  text: string;
};

class AddTextSnippets extends EffectABC {
  static BRICK_ID = validateRegistryId("@pixiebrix/command/text-snippets");

  constructor() {
    super(
      AddTextSnippets.BRICK_ID,
      "[Experimental] Add Text Snippets",
      "Add text snippets",
    );
  }

  override async isPure(): Promise<boolean> {
    // Safe default -- need to be able to inspect the inputs to determine if pure
    return false;
  }

  override async isRootAware(): Promise<boolean> {
    // Safe default -- need to be able to inspect the inputs to determine if any sub-calls are root aware
    return true;
  }

  inputSchema: Schema = propertiesToSchema(
    {
      snippets: {
        type: "array",
        description: "The list of text snippets to add",
        items: {
          type: "object",
          properties: {
            shortcut: {
              type: "string",
              description: "The shortcut for the text command",
            },
            // Consider defaulting title to the shortcut
            title: {
              type: "string",
              description: "The title for the Text Command",
            },
            text: {
              type: "string",
              description: "The text to insert",
            },
          },
          required: ["shortcut", "title", "text"],
        },
      },
    },
    ["snippets"],
  );

  async effect(
    { snippets }: BrickArgs<{ snippets: Snippet[] }>,
    { logger, abortSignal }: BrickOptions,
  ): Promise<void> {
    // The runtime checks the abortSignal for each brick. But check here too to avoid flickering in the popover
    if (abortSignal?.aborted) {
      return;
    }

    if (logger.context.extensionId == null) {
      throw new Error("Must be run in the context of a mod");
    }

    for (const { shortcut, title, text } of snippets) {
      commandRegistry.register({
        componentId: logger.context.extensionId,
        // Trim leading slash to be resilient to user input
        shortcut: shortcut.replace(/^\//, ""),
        title,
        async handler(): Promise<string> {
          return text;
        },
      });
    }

    const { textCommandPopover } = await getSettingsState();
    if (textCommandPopover) {
      initCommandController();
    }
  }
}

export default AddTextSnippets;
