/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { ElementType, FormState } from "@/devTools/editor/editorSlice";
import { IExtension } from "@/core";
import { find as findBrick } from "@/registry/localRegistry";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import menuItemExtension from "@/devTools/editor/extensionPoints/menuItem";
import triggerExtension from "@/devTools/editor/extensionPoints/trigger";
import panelExtension from "@/devTools/editor/extensionPoints/panel";
import contextMenuExtension from "@/devTools/editor/extensionPoints/contextMenu";
import actionPanelExtension from "@/devTools/editor/extensionPoints/actionPanel";
import { ElementConfig } from "@/devTools/editor/extensionPoints/elementConfig";

export const ADAPTERS = new Map<ElementType, ElementConfig>([
  ["trigger", triggerExtension],
  ["panel", panelExtension],
  ["contextMenu", contextMenuExtension],
  ["actionPanel", actionPanelExtension],
  ["menuItem", menuItemExtension],
]);

export async function getType(extension: IExtension): Promise<ElementType> {
  const brick = await findBrick(extension.extensionPointId);
  if (!brick) {
    console.exception("Cannot find extension point", {
      extensionPointId: extension.extensionPointId,
    });
    throw new Error("Cannot find extension point");
  }
  const extensionPoint = (brick.config as unknown) as ExtensionPointConfig;
  return extensionPoint.definition.type;
}

export async function extensionToFormState(
  extension: IExtension
): Promise<FormState> {
  const type = await getType(extension);
  const { formState } = ADAPTERS.get(type);
  if (!formState) {
    throw new Error(
      `Editing existing extensions not implemented for type: '${type}'`
    );
  }
  return formState(extension);
}
