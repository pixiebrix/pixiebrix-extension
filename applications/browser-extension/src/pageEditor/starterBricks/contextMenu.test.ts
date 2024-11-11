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

import config from "@/pageEditor/starterBricks/contextMenu";
import { internalStarterBrickMetaFactory } from "@/pageEditor/starterBricks/base";
import { createNewUnsavedModMetadata } from "@/utils/modUtils";
import { draftModStateFactory } from "@/testUtils/factories/pageEditorFactories";

describe("contextMenu", () => {
  it("smoke test", () => {
    const formState = config.fromNativeElement({
      url: "https://example.com",
      starterBrickMetadata: internalStarterBrickMetaFactory(),
      modMetadata: createNewUnsavedModMetadata({ modName: "Smoke Test" }),
      element: null,
    });

    expect(
      config.selectModComponent(formState, draftModStateFactory()),
    ).toEqual(
      expect.objectContaining({
        config: {
          action: [],
          onSuccess: true,
          title: "Context menu item",
        },
      }),
    );
  });

  it("defaults to all sites", () => {
    const formState = config.fromNativeElement({
      url: "https://example.com",
      starterBrickMetadata: internalStarterBrickMetaFactory(),
      modMetadata: createNewUnsavedModMetadata({ modName: "Smoke Test" }),
      element: null,
    });

    expect(
      config.selectStarterBrickDefinition(formState).definition.isAvailable,
    ).toStrictEqual({
      allFrames: true,
      matchPatterns: ["*://*/*"],
      selectors: [],
      urlPatterns: [],
    });
  });
});
