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
import type {
  BrickArgs,
  BrickOptions,
  PipelineExpression,
} from "@/types/runtimeTypes";
import { type Schema } from "@/types/schemaTypes";
import { EffectABC } from "@/types/bricks/effectTypes";
import { initCommandController } from "@/contentScript/shortcutSnippetMenu/shortcutSnippetMenuController";
import { BusinessError } from "@/errors/businessErrors";
import { getSettingsState } from "@/store/settings/settingsStorage";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import type { PlatformCapability } from "@/platform/capabilities";
import { propertiesToSchema } from "@/utils/schemaUtils";
import { normalizeShortcut } from "@/bricks/effects/AddTextSnippets";

type CommandArgs = {
  /**
   * The shortcut for the text command
   */
  shortcut: string;
  /**
   * The title for the Text Command
   */
  title: string;
  /**
   * An optional preview of the text to insert
   */
  preview?: string;
  /**
   * The text generator to run
   */
  generate: PipelineExpression;
};

class AddTextCommand extends EffectABC {
  static BRICK_ID = validateRegistryId("@pixiebrix/command/text-command");

  static DEFAULT_PIPELINE_VAR = validateOutputKey("currentText");

  constructor() {
    super(
      AddTextCommand.BRICK_ID,
      "[Experimental] Add Dynamic Text Snippet",
      "Add/register a dynamic text snippet to the Snippet Shortcut Menu",
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
      shortcut: {
        type: "string",
        description: "The shortcut for the text command",
      },
      title: {
        type: "string",
        description: "The title for the Text Command",
      },
      preview: {
        type: "string",
        title: "Text Preview",
        description: "An optional preview of the text to insert",
      },
      generate: {
        $ref: "https://app.pixiebrix.com/schemas/pipeline#",
        description: "The text generator to run",
      },
    },
    ["shortcut", "title", "generate"],
  );

  override async getRequiredCapabilities(): Promise<PlatformCapability[]> {
    return ["commandPopover"];
  }

  async effect(
    {
      shortcut,
      title,
      preview,
      generate: generatePipeline,
    }: BrickArgs<CommandArgs>,
    { logger, runPipeline, platform, abortSignal }: BrickOptions,
  ): Promise<void> {
    // The runtime checks the abortSignal for each brick. But check here too to avoid flickering in the popover
    if (abortSignal?.aborted) {
      return;
    }

    if (logger.context.extensionId == null) {
      throw new Error("Must be run in the context of a mod");
    }

    // Counter to keep track of the action run number for tracing
    let counter = 0;

    platform.commandPopover.register({
      componentId: logger.context.extensionId,
      // Trim leading command key in shortcut to be resilient to user input
      shortcut: normalizeShortcut(shortcut),
      title,
      preview,
      async handler(currentText: string): Promise<string> {
        counter++;

        const last = await runPipeline(
          generatePipeline,
          { key: "generate", counter },
          {
            [`@${AddTextCommand.DEFAULT_PIPELINE_VAR}`]: currentText,
          },
        );

        if (last == null) {
          throw new BusinessError("Text generator did not return a value");
        }

        if (typeof last === "object") {
          throw new BusinessError("Text generator returned an object/array");
        }

        if (typeof last !== "string") {
          logger.debug("Text generator returned non-string value", { last });
        }

        return (last as string | boolean | number).toLocaleString();
      },
    });

    const { snippetShortcutMenu } = await getSettingsState();
    if (snippetShortcutMenu) {
      initCommandController();
    }
  }
}

export default AddTextCommand;
