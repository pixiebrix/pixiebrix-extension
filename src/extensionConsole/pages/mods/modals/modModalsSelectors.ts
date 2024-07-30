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

import { type RootState } from "@/extensionConsole/store/optionsStore";

export const selectShowLogsContext = ({ modModals }: RootState) =>
  modModals.showLogsContext;

export const selectShowShareContext = ({ modModals }: RootState) =>
  modModals.showShareContext;

export const selectShowPublishContext = ({ modModals }: RootState) =>
  modModals.showPublishContext;

export const selectModalsContext = ({ modModals }: RootState) => modModals;
