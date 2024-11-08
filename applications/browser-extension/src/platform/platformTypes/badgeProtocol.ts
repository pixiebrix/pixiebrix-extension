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

import type { Nullishable } from "../../utils/nullishUtils";
import type { ModComponentRef } from "../../types/modComponentTypes";

/**
 * Protocol for a badge displayed in the context. For the extension, corresponds to the browser action badge.
 * @since 1.8.0
 */
export type BadgeProtocol = {
  /**
   * Set the badge text. If the text is null, the badge will be hidden.
   */
  setText(
    text: Nullishable<string>,
    options?: { modComponentRef?: ModComponentRef },
  ): void;
};
