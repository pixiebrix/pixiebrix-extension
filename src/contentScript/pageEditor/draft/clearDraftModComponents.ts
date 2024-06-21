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

import { clearEditorExtension } from "@/contentScript/lifecycle";
import { type UUID } from "@/types/stringTypes";
import { expectContext } from "@/utils/expectContext";

/**
 * A version of `clearEditorExtension` that takes an object instead of a positional UUID argument.
 * @param uuid the uuid of the mod component, or null to clear all page editor mod components
 * @see clearEditorExtension
 */
export async function clearDraftModComponents({
  uuid,
}: {
  uuid?: UUID;
}): Promise<void> {
  expectContext("contentScript");

  clearEditorExtension(uuid);
}
