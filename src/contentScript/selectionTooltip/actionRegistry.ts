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
import type { Nullishable } from "@/utils/nullishUtils";
import type { IconConfig } from "@/types/iconTypes";
import { splitStartingEmoji } from "@/utils/stringUtils";
import { SimpleEventTarget } from "@/utils/SimpleEventTarget";

type TextSelectionAction = {
  // NOTE: currently there's no way to set icons for context menu items, so this will always be null
  icon: Nullishable<IconConfig>;
  title: string;
  handler: (text: string) => void;
};

type RegisteredAction = TextSelectionAction & {
  emoji: Nullishable<string>;
};

const defaultIcon: IconConfig = {
  id: "box",
  library: "bootstrap",
};

class ActionRegistry {
  /**
   * Map from component UUID to registered action
   */
  public readonly actions = new Map<UUID, RegisteredAction>();

  /**
   * Event fired when the set of registered actions changes
   */
  public readonly onChange = new SimpleEventTarget<RegisteredAction[]>();

  register(componentId: UUID, action: TextSelectionAction): void {
    const { startingEmoji } = splitStartingEmoji(action.title);
    const icon = action.icon ?? defaultIcon;
    this.actions.set(componentId, { ...action, emoji: startingEmoji, icon });
    this.onChange.emit([...this.actions.values()]);
  }

  unregister(componentId: UUID): void {
    this.actions.delete(componentId);
    this.onChange.emit([...this.actions.values()]);
  }
}

export default ActionRegistry;
