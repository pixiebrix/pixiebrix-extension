/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { TabStateRootState } from "@/pageEditor/tabState/tabStateTypes";

export const selectFrameState = ({ tabState }: TabStateRootState) =>
  tabState.frameState;

export const selectTabStateError = ({ tabState }: TabStateRootState) =>
  tabState.error;

export const selectTabHasPermissions = ({ tabState }: TabStateRootState) =>
  tabState.frameState.hasPermissions;

export const selectTabIsConnectingToContentScript = ({
  tabState,
}: TabStateRootState) => tabState.isConnecting;
