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
import type { IconConfig } from "@/types/iconTypes";
import { splitStartingEmoji } from "@/utils/stringUtils";
import { SimpleEventTarget } from "@/utils/SimpleEventTarget";
import type { Nullishable } from "@/utils/nullishUtils";
import type {
  TextSelectionMenuProtocol,
  TextSelectionAction,
} from "@/platform/platformTypes/textSelectionMenuProtocol";

/**
 * A registered text selection action.
 */
export type RegisteredAction = TextSelectionAction & {
  /**
   * Emoji icon extracted from the title, or nullish if the title did not contain a leading emoji
   */
  emoji: Nullishable<string>;
};

const defaultIcon: IconConfig = {
  id: "box",
  library: "bootstrap",
};

/**
 * Registry for text selection actions.
 * @since 1.8.10
 */
class ActionRegistry implements TextSelectionMenuProtocol {
  /**
   * Map from component UUID to registered action
   */
  public readonly actions = new Map<UUID, RegisteredAction>();

  /**
   * Event fired when the set of registered actions changes
   */
  public readonly onChange = new SimpleEventTarget<RegisteredAction[]>();

  /**
   * Register a new text selection action. Overwrites any existing action for the mod component.
   * @param componentId the mod component id
   * @param action the action definition
   */
  register(componentId: UUID, action: TextSelectionAction): void {
    const { startingEmoji } = splitStartingEmoji(action.title);
    this.actions.set(componentId, {
      ...action,
      emoji: startingEmoji,
      icon: action.icon ?? defaultIcon,
    });
    this.onChange.emit([...this.actions.values()]);
  }

  /**
   * Unregister a text selection action. Does nothing if an action for the component is not registered.
   * @param componentId the mod component id
   */
  unregister(componentId: UUID): void {
    this.actions.delete(componentId);
    this.onChange.emit([...this.actions.values()]);
  }
}

export default ActionRegistry;
