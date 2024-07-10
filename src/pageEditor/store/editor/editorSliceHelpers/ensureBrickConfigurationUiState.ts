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

/* eslint-disable security/detect-object-injection -- lots of immer-style code here dealing with Records */

import { makeInitialBrickConfigurationUIState } from "@/pageEditor/store/editor/uiState";
import { type BrickPipelineUIState } from "@/pageEditor/store/editor/uiStateTypes";
import { type UUID } from "@/types/stringTypes";
import { type Draft } from "immer";

export function ensureBrickConfigurationUIState(
  state: Draft<BrickPipelineUIState>,
  nodeId: UUID,
) {
  state.nodeUIStates[nodeId] ??= makeInitialBrickConfigurationUIState(nodeId);
}
