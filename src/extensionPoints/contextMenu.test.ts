/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { type UnknownObject } from "@/types/objectTypes";
import { define } from "cooky-cutter";
import { type ExtensionPointConfig } from "@/extensionPoints/types";
import { validateRegistryId } from "@/types/helpers";
import { type Metadata } from "@/types/recipeTypes";
import { uuidSequence } from "@/testUtils/factories";
import { type BlockPipeline } from "@/blocks/types";
import { RootReader } from "@/extensionPoints/extensionPointTestUtils";
import blockRegistry from "@/blocks/registry";
import {
  type ContextMenuConfig,
  fromJS,
  type MenuDefinition,
} from "@/extensionPoints/contextMenu";
import { ResolvedExtension } from "@/types/extensionTypes";

const extensionPointFactory = (definitionOverrides: UnknownObject = {}) =>
  define<ExtensionPointConfig<MenuDefinition>>({
    apiVersion: "v3",
    kind: "extensionPoint",
    metadata: (n: number) =>
      ({
        id: validateRegistryId(`test/extension-point-${n}`),
        name: "Test Extension Point",
      } as Metadata),
    definition: define<MenuDefinition>({
      type: "contextMenu",
      contexts: () => ["page"] as any,
      targetMode: "document",
      isAvailable: () => ({
        matchPatterns: ["*://*/*"],
      }),
      reader: () => [rootReader.id],
      ...definitionOverrides,
    }),
  });

const extensionFactory = define<ResolvedExtension<ContextMenuConfig>>({
  apiVersion: "v3",
  _resolvedExtensionBrand: undefined,
  id: uuidSequence,
  extensionPointId: (n: number) =>
    validateRegistryId(`test/extension-point-${n}`),
  _recipe: null,
  label: "Test Extension",
  config: define<ContextMenuConfig>({
    title: "Test Menu Item",
    action: () => [] as BlockPipeline,
  }),
});

const rootReader = new RootReader();

beforeEach(() => {
  window.document.body.innerHTML = "";
  document.body.innerHTML = "";
  blockRegistry.clear();
  blockRegistry.register([rootReader]);
  rootReader.readCount = 0;
  rootReader.ref = undefined;
});

describe("contextMenuExtension", () => {
  it("should add extension", async () => {
    const extensionPoint = fromJS(extensionPointFactory()());
    const extension = extensionFactory();
    extensionPoint.addExtension(extension);
  });

  it("should include context menu props in schema", async () => {
    const extensionPoint = fromJS(extensionPointFactory()());
    const reader = await extensionPoint.defaultReader();
    expect(reader.outputSchema.properties).toHaveProperty("selectionText");
  });

  it("should include context menu props in preview", async () => {
    const extensionPoint = fromJS(extensionPointFactory()());
    const reader = await extensionPoint.previewReader();
    const value = await reader.read(document);
    expect(value).toHaveProperty("selectionText");
  });
});
