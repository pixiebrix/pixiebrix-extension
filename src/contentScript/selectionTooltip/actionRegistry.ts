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

type SelectionAction = {
  icon: Nullishable<IconConfig>;
  title: string;
  handler: (text: string) => void;
};

type RegisteredSelectionAction = SelectionAction & {
  emoji: string;
};

class ActionRegistry {
  /**
   * Map from component UUID to action
   * @private
   */
  public readonly actions = new Map<UUID, RegisteredSelectionAction>();

  register(componentId: UUID, action: SelectionAction): void {
    const { startingEmoji } = splitStartingEmoji(action.title);

    if (startingEmoji) {
      this.actions.set(componentId, { ...action, emoji: startingEmoji });
    }
  }

  unregister(componentId: UUID): void {
    this.actions.delete(componentId);
  }
}

export default ActionRegistry;
