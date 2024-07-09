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
import { type Schema } from "@/types/schemaTypes";
import { EffectABC } from "@/types/bricks/effectTypes";
import { initSnippetShortcutMenuController } from "@/contentScript/snippetShortcutMenu/snippetShortcutMenuController";
import { getSettingsState } from "@/store/settings/settingsStorage";
import type { PlatformCapability } from "@/platform/capabilities";
import { propertiesToSchema } from "@/utils/schemaUtils";

/**
 * Regex for likely command keys to strip from shortcut definitions
 */
const COMMAND_KEY_REGEX = /^[/\\]/;

/**
 * Normalize a shortcut by removing the leading command key (if any)
 * @param shortcut user-defined shortcut
 */
export function normalizeShortcut(shortcut: string): string {
  return shortcut.replace(COMMAND_KEY_REGEX, "");
}

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
      "Add Text Snippets",
      "Add/register text snippets to the Snippet Shortcut Menu",
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

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    return ["snippetShortcutMenu"];
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
    { logger, abortSignal, platform }: BrickOptions,
  ): Promise<void> {
    // The runtime checks the abortSignal for each brick. But check here too to avoid flickering in the popover
    if (abortSignal?.aborted) {
      return;
    }

    if (logger.context.modComponentId == null) {
      throw new Error("Must be run in the context of a mod component");
    }

    for (const { shortcut, title, text } of snippets) {
      platform.snippetShortcutMenu.register({
        componentId: logger.context.modComponentId,
        context: logger.context,
        shortcut: normalizeShortcut(shortcut),
        title,
        preview: text,
        async handler(): Promise<string> {
          return text;
        },
      });
    }

    const { snippetShortcutMenu } = await getSettingsState();
    if (snippetShortcutMenu) {
      initSnippetShortcutMenuController();
    }
  }
}

export default AddTextSnippets;
