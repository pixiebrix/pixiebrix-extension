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

import { type IExtension } from "@/core";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";

export type SidebarItem = IExtension | FormState;

export function getLabel(extension: FormState): string {
  return extension.label ?? extension.extensionPoint.metadata.name;
}

export function isExtension(value: SidebarItem): value is IExtension {
  return "extensionPointId" in value;
}
