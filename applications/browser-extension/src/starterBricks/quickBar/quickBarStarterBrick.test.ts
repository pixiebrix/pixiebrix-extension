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

import { validateRegistryId } from "../../types/helpers";
import { define } from "cooky-cutter";
import { type StarterBrickDefinitionLike } from "@/starterBricks/types";
import { type Metadata, DefinitionKinds } from "@/types/registryTypes";
import { type BrickPipeline } from "@/bricks/types";
import { getDocument, RootReader, tick } from "@/starterBricks/testHelpers";
import brickRegistry from "@/bricks/registry";
import { fromJS } from "@/starterBricks/quickBar/quickBarStarterBrick";
import { type Menus } from "webextension-polyfill";
import userEvent from "@testing-library/user-event";
import quickBarRegistry from "@/components/quickBar/quickBarRegistry";
import {
  initQuickBarApp,
  toggleQuickBar,
} from "@/components/quickBar/QuickBarApp";
import { mockAnimationsApi } from "jsdom-testing-mocks";
import { type HydratedModComponent } from "../../types/modComponentTypes";
import { RunReason } from "../../types/runtimeTypes";

import { uuidSequence } from "../../testUtils/factories/stringFactories";
import defaultActions, {
  pageEditorAction,
} from "@/components/quickBar/defaultActions";
import { getPlatform } from "../../platform/platformContext";
import { type QuickBarDefinition, type QuickBarConfig } from "./quickBarTypes";
import { StarterBrickTypes } from "../../types/starterBrickTypes";
import { modMetadataFactory } from "../../testUtils/factories/modComponentFactories";

const rootReaderId = validateRegistryId("test/root-reader");

mockAnimationsApi();

jest.mock("../../auth/featureFlagStorage", () => ({
  flagOn: jest.fn().mockReturnValue(false),
  restrict: jest.fn().mockReturnValue(false),
}));

const starterBrickFactory = (definitionOverrides: UnknownObject = {}) =>
  define<StarterBrickDefinitionLike<QuickBarDefinition>>({
    apiVersion: "v3",
    kind: DefinitionKinds.STARTER_BRICK,
    metadata: (n: number) =>
      ({
        id: validateRegistryId(`test/starter-brick-${n}`),
        name: "Test Starter Brick",
      }) as Metadata,
    definition: define<QuickBarDefinition>({
      type: StarterBrickTypes.QUICK_BAR_ACTION,
      isAvailable: () => ({
        matchPatterns: ["*://*/*"],
      }),
      contexts: () => ["all"] as Menus.ContextType[],
      targetMode: "eventTarget",
      reader: () => [rootReaderId],
      ...definitionOverrides,
    }),
  });

const modComponentFactory = define<HydratedModComponent<QuickBarConfig>>({
  apiVersion: "v3",
  _hydratedModComponentBrand: undefined as never,
  id: uuidSequence,
  extensionPointId: (n: number) =>
    validateRegistryId(`test/starter-brick-${n}`),
  modMetadata: modMetadataFactory,
  label: "Test Mod Component",
  config: define<QuickBarConfig>({
    title: "Test Action",
    action: () => [] as BrickPipeline,
  }),
});

const rootReader = new RootReader();

beforeEach(() => {
  window.document.body.innerHTML = "";
  document.body.innerHTML = "";
  brickRegistry.clear();
  brickRegistry.register([rootReader]);
  rootReader.readCount = 0;
  rootReader.ref = null;
});

const NUM_DEFAULT_QUICKBAR_ACTIONS = [...defaultActions, pageEditorAction]
  .length;

describe("quickBarStarterBrick", () => {
  it("quick bar smoke test", async () => {
    const user = userEvent.setup();

    document.body.innerHTML = getDocument("<div></div>").body.innerHTML;

    // Ensure default actions are registered
    await initQuickBarApp();

    const starterBrick = fromJS(getPlatform(), starterBrickFactory()());

    starterBrick.registerModComponent(
      modComponentFactory({
        extensionPointId: starterBrick.id,
      }),
    );

    expect(quickBarRegistry.currentActions).toHaveLength(
      NUM_DEFAULT_QUICKBAR_ACTIONS,
    );
    await starterBrick.install();
    await starterBrick.runModComponents({ reason: RunReason.MANUAL });

    expect(quickBarRegistry.currentActions).toHaveLength(
      NUM_DEFAULT_QUICKBAR_ACTIONS + 1,
    );

    expect(rootReader.readCount).toBe(0);

    // QuickBar adds another div to the body
    expect(document.body.innerHTML).toBe(
      '<div class="pixiebrix-quickbar-container"></div><div></div>',
    );

    // :shrug: I'm not sure how to get the kbar to show using shortcuts in jsdom, so just toggle manually
    await user.keyboard("[Ctrl] k");
    await toggleQuickBar();

    await tick();

    // Should be showing the QuickBar portal. The innerHTML doesn't contain the QuickBar actions at this point
    expect(document.body.innerHTML).not.toBe("<div></div><div></div>");

    starterBrick.uninstall();
  });
});
