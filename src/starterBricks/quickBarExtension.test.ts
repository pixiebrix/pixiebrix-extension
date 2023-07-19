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

import { validateRegistryId } from "@/types/helpers";
import { type UnknownObject } from "@/types/objectTypes";
import { define } from "cooky-cutter";
import { type StarterBrickConfig } from "@/starterBricks/types";
import { type Metadata } from "@/types/registryTypes";
import { type BrickPipeline } from "@/bricks/types";
import {
  getDocument,
  RootReader,
  tick,
} from "@/starterBricks/starterBrickTestUtils";
import blockRegistry from "@/bricks/registry";
import {
  fromJS,
  type QuickBarConfig,
  type QuickBarDefinition,
} from "@/starterBricks/quickBarExtension";
import { Menus } from "webextension-polyfill";
import ContextType = Menus.ContextType;
import userEvent from "@testing-library/user-event";
import quickBarRegistry from "@/components/quickBar/quickBarRegistry";
import { toggleQuickBar } from "@/components/quickBar/QuickBarApp";
import { mockAnimationsApi } from "jsdom-testing-mocks";
import { type ResolvedModComponent } from "@/types/modComponentTypes";
import { RunReason } from "@/types/runtimeTypes";

import { uuidSequence } from "@/testUtils/factories/stringFactories";

const rootReaderId = validateRegistryId("test/root-reader");

mockAnimationsApi();

const starterBrickFactory = (definitionOverrides: UnknownObject = {}) =>
  define<StarterBrickConfig<QuickBarDefinition>>({
    apiVersion: "v3",
    kind: "extensionPoint",
    metadata: (n: number) =>
      ({
        id: validateRegistryId(`test/starter-brick-${n}`),
        name: "Test Starter Brick",
      } as Metadata),
    definition: define<QuickBarDefinition>({
      type: "quickBar",
      isAvailable: () => ({
        matchPatterns: ["*://*/*"],
      }),
      contexts: () => ["all"] as ContextType[],
      targetMode: "eventTarget",
      reader: () => [rootReaderId],
      ...definitionOverrides,
    }),
  });

const extensionFactory = define<ResolvedModComponent<QuickBarConfig>>({
  apiVersion: "v3",
  _resolvedModComponentBrand: undefined,
  id: uuidSequence,
  extensionPointId: (n: number) =>
    validateRegistryId(`test/starter-brick-${n}`),
  _recipe: null,
  label: "Test Extension",
  config: define<QuickBarConfig>({
    title: "Test Action",
    action: () => [] as BrickPipeline,
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

const NUM_DEFAULT_QUICKBAR_ACTIONS = 5;

describe("quickBarExtension", () => {
  it("quick bar smoke test", async () => {
    const user = userEvent.setup();

    document.body.innerHTML = getDocument("<div></div>").body.innerHTML;

    const starterBrick = fromJS(starterBrickFactory()());

    starterBrick.registerModComponent(
      extensionFactory({
        extensionPointId: starterBrick.id,
      })
    );

    expect(quickBarRegistry.currentActions).toHaveLength(
      NUM_DEFAULT_QUICKBAR_ACTIONS
    );
    await starterBrick.install();
    await starterBrick.runModComponents({ reason: RunReason.MANUAL });

    expect(quickBarRegistry.currentActions).toHaveLength(
      NUM_DEFAULT_QUICKBAR_ACTIONS + 1
    );

    expect(rootReader.readCount).toBe(0);

    // QuickBar adds another div to the body
    expect(document.body.innerHTML).toEqual(
      '<div id="pixiebrix-quickbar-container"></div><div></div>'
    );

    // :shrug: I'm not sure how to get the kbar to show using shortcuts in jsdom, so just toggle manually
    await user.keyboard("[Ctrl] k");
    toggleQuickBar();

    await tick();

    // Should be showing the QuickBar portal. The innerHTML doesn't contain the QuickBar actions at this point
    expect(document.body.innerHTML).not.toEqual("<div></div><div></div>");

    starterBrick.uninstall();
  });
});
