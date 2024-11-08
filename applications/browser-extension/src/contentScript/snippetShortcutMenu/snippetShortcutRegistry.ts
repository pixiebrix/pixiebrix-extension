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

import type { UUID } from "../../types/stringTypes";
import { SimpleEventTarget } from "../../utils/SimpleEventTarget";
import { remove } from "lodash";
import type { SnippetShortcut } from "../../platform/platformTypes/snippetShortcutMenuProtocol";

/**
 * Registry for shortcut snippets
 * @since 1.8.10
 */
class SnippetRegistry {
  /**
   * Map from component UUID to registered action
   */
  public readonly snippetShortcuts: SnippetShortcut[] = [];

  /**
   * Event fired when the set of registered shortcut snippets change
   */
  public readonly onChange = new SimpleEventTarget<SnippetShortcut[]>();

  /**
   * Register a new text snippet
   */
  register(newSnippetShortcut: SnippetShortcut): void {
    const index = this.snippetShortcuts.findIndex(
      (snippetShortcut) =>
        newSnippetShortcut.shortcut === snippetShortcut.shortcut,
    );

    if (index >= 0) {
      // eslint-disable-next-line security/detect-object-injection -- number from findIndex
      this.snippetShortcuts[index] = newSnippetShortcut;
    } else {
      this.snippetShortcuts.push(newSnippetShortcut);
    }

    this.onChange.emit(this.snippetShortcuts);
  }

  /**
   * Unregister all shortcut snippets for a mod component
   * @param componentId the mod component id
   */
  unregister(componentId: UUID): void {
    remove(
      this.snippetShortcuts,
      (snippetShortcut) => snippetShortcut.componentId === componentId,
    );
    this.onChange.emit(this.snippetShortcuts);
  }

  /**
   * Clear all shortcut snippets.
   */
  clear(): void {
    this.snippetShortcuts.splice(0);
    this.onChange.emit(this.snippetShortcuts);
  }
}

export default SnippetRegistry;
