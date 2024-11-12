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

import { EditorState } from "@/pageEditor/store/editor/pageEditorTypes";
import { SidebarState } from "@/types/sidebarTypes";
import { Draft } from "immer";

function castState(state: Draft<EditorState>): EditorState;
function castState(state: Draft<SidebarState>): SidebarState;
function castState<T>(state: Draft<T>): T {
  return state as T;
}

export default castState;
