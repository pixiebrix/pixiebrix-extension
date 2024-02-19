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

import type { UUID } from "@/types/stringTypes";
import { SimpleEventTarget } from "@/utils/SimpleEventTarget";
import { remove } from "lodash";

export type TextCommand = {
  /**
   * The mod component id that owns the command/snippet
   */
  componentId: UUID;
  /**
   * The shortcut to trigger the command, excluding the command key
   */
  shortcut: string;
  /**
   * The title/label of the snippet
   */
  title: string;
  /**
   * The text generator
   * @param currentText current text in the editor
   */
  handler: (currentText: string) => Promise<string>;
};

/**
 * Registry for slash commands
 * @since 1.8.10
 */
class CommandRegistry {
  /**
   * Map from component UUID to registered action
   */
  public readonly commands: TextCommand[] = [];

  /**
   * Event fired when the set of registered commands change
   */
  public readonly onChange = new SimpleEventTarget<TextCommand[]>();

  /**
   * Register a new text snippet
   */
  register(newCommand: TextCommand): void {
    const index = this.commands.findIndex(
      (command) => newCommand.shortcut === command.shortcut,
    );

    if (index >= 0) {
      // eslint-disable-next-line security/detect-object-injection -- number from findIndex
      this.commands[index] = newCommand;
    } else {
      this.commands.push(newCommand);
    }

    this.onChange.emit(this.commands);
  }

  /**
   * Unregister all commands for a mod component
   * @param componentId the mod component id
   */
  unregister(componentId: UUID): void {
    remove(this.commands, (command) => command.componentId === componentId);
    this.onChange.emit(this.commands);
  }
}

export default CommandRegistry;
