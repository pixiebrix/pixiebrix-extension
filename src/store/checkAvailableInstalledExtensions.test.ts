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

import { configureStore } from "@reduxjs/toolkit";
import { actions, editorSlice } from "@/pageEditor/store/editor/editorSlice";
import extensionsSlice from "@/store/extensionsSlice";
import { type EditorRootState } from "@/pageEditor/store/editor/pageEditorTypes";
import { type ModComponentsRootState } from "@/store/extensionsTypes";
import { selectModComponentAvailability } from "@/pageEditor/store/editor/editorSelectors";
import { getRunningStarterBricks } from "@/contentScript/messenger/api";
import { validateRegistryId } from "@/types/helpers";
import { RemoteButtonStarterBrick } from "@/starterBricks/button/buttonStarterBrick";
import { type StarterBrickDefinitionLike } from "@/starterBricks/types";
import { type Metadata } from "@/types/registryTypes";
import { RemoteQuickBarStarterBrick } from "@/starterBricks/quickBar/quickBarStarterBrick";
import { starterBrickDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { standaloneModDefinitionFactory } from "@/testUtils/factories/modComponentFactories";
import { metadataFactory } from "@/testUtils/factories/metadataFactory";
import { getCurrentInspectedURL } from "@/pageEditor/context/connection";
import { getPlatform } from "@/platform/platformContext";
import { type ButtonDefinition } from "@/starterBricks/button/buttonStarterBrickTypes";
import { type QuickBarDefinition } from "@/starterBricks/quickBar/quickBarTypes";
import { StarterBrickTypes } from "@/types/starterBrickTypes";

jest.mock("@/contentScript/messenger/api");

jest.mock("@/pageEditor/context/connection");

const { actions: optionsActions, reducer: extensionsReducer } = extensionsSlice;

describe("checkAvailableInstalledExtensions", () => {
  it("checks installed extensions correctly", async () => {
    const testUrl = "https://www.myUrl.com/*";
    jest.mocked(getCurrentInspectedURL).mockResolvedValue(testUrl);

    const availableButtonId = validateRegistryId("test/available-button");
    const availableButton = standaloneModDefinitionFactory({
      extensionPointId: availableButtonId,
    });
    const unavailableButtonId = validateRegistryId("test/unavailable-button");
    const unavailableButton = standaloneModDefinitionFactory({
      extensionPointId: unavailableButtonId,
    });
    const availableQbId = validateRegistryId("test/available-quickbar");
    const availableQb = standaloneModDefinitionFactory({
      extensionPointId: availableQbId,
    });
    const unavailableQbId = validateRegistryId("test/unavailable-quickbar");
    const unavailableQb = standaloneModDefinitionFactory({
      extensionPointId: unavailableQbId,
    });

    const availableButtonStarterBrickDefinition = starterBrickDefinitionFactory(
      {
        metadata(): Metadata {
          return metadataFactory({
            id: availableButtonId,
          });
        },
        definition(): ButtonDefinition {
          return {
            type: StarterBrickTypes.BUTTON,
            containerSelector: "",
            template: "",
            isAvailable: {
              matchPatterns: [testUrl],
            },
            reader: validateRegistryId("@pixiebrix/document-context"),
          };
        },
      },
    ) as StarterBrickDefinitionLike<ButtonDefinition>;
    const availableButtonExtensionPoint = new RemoteButtonStarterBrick(
      getPlatform(),
      availableButtonStarterBrickDefinition,
    );

    const availableQuickbarStarterBrickDefinition =
      starterBrickDefinitionFactory({
        metadata(): Metadata {
          return metadataFactory({
            id: availableQbId,
          });
        },
        definition(): QuickBarDefinition {
          return {
            type: StarterBrickTypes.QUICK_BAR_ACTION,
            contexts: ["all"],
            documentUrlPatterns: [testUrl],
            isAvailable: {
              matchPatterns: [testUrl],
            },
            reader: validateRegistryId("@pixiebrix/document-context"),
            targetMode: "document",
          };
        },
      }) as StarterBrickDefinitionLike<QuickBarDefinition>;
    const availableQuickbarExtensionPoint = new RemoteQuickBarStarterBrick(
      getPlatform(),
      availableQuickbarStarterBrickDefinition,
    );
    jest
      .mocked(getRunningStarterBricks)
      .mockResolvedValue([
        availableButtonExtensionPoint,
        availableQuickbarExtensionPoint,
      ]);

    const store = configureStore<EditorRootState & ModComponentsRootState>({
      reducer: {
        editor: editorSlice.reducer,
        options: extensionsReducer,
      },
    });

    store.dispatch(
      optionsActions.activateStandaloneModDefinition(availableButton),
    );
    store.dispatch(
      optionsActions.activateStandaloneModDefinition(unavailableButton),
    );
    store.dispatch(optionsActions.activateStandaloneModDefinition(availableQb));
    store.dispatch(
      optionsActions.activateStandaloneModDefinition(unavailableQb),
    );

    await store.dispatch(actions.checkAvailableActivatedModComponents());

    const state = store.getState();

    const { availableActivatedModComponentIds } =
      selectModComponentAvailability(state);

    expect(availableActivatedModComponentIds).toStrictEqual([
      availableButton.id,
      availableQb.id,
    ]);
  });
});
