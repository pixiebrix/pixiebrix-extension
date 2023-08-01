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

import { configureStore } from "@reduxjs/toolkit";
import { actions, editorSlice } from "@/pageEditor/slices/editorSlice";
import extensionsSlice from "@/store/extensionsSlice";
import { type EditorRootState } from "@/pageEditor/pageEditorTypes";
import { type ModComponentsRootState } from "@/store/extensionsTypes";
import { selectExtensionAvailability } from "@/pageEditor/slices/editorSelectors";
import { getInstalledExtensionPoints } from "@/contentScript/messenger/api";
import { getCurrentURL } from "@/pageEditor/utils";
import { validateRegistryId } from "@/types/helpers";
import {
  type MenuDefinition,
  RemoteMenuItemExtensionPoint,
} from "@/starterBricks/menuItemExtension";
import { type StarterBrickConfig } from "@/starterBricks/types";
import { type Metadata } from "@/types/registryTypes";
import {
  type QuickBarDefinition,
  RemoteQuickBarExtensionPoint,
} from "@/starterBricks/quickBarExtension";
import {
  starterBrickConfigFactory,
  metadataFactory,
} from "@/testUtils/factories/modDefinitionFactories";
import { standaloneModDefinitionFactory } from "@/testUtils/factories/modComponentFactories";

jest.mock("@/contentScript/messenger/api", () => ({
  getInstalledExtensionPoints: jest.fn(),
}));

jest.mock("@/pageEditor/utils", () => ({
  getCurrentURL: jest.fn(),
}));

const { actions: optionsActions, reducer: extensionsReducer } = extensionsSlice;

describe("checkAvailableInstalledExtensions", () => {
  test("it checks installed extensions correctly", async () => {
    const testUrl = "https://www.myUrl.com/*";
    (getCurrentURL as jest.Mock).mockResolvedValue(testUrl);

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

    const availableButtonStarterBrickConfig = starterBrickConfigFactory({
      metadata(): Metadata {
        return metadataFactory({
          id: availableButtonId,
        });
      },
      definition(): MenuDefinition {
        return {
          type: "menuItem",
          containerSelector: "",
          template: "",
          isAvailable: {
            matchPatterns: [testUrl],
          },
          reader: validateRegistryId("@pixiebrix/document-context"),
        };
      },
    }) as StarterBrickConfig<MenuDefinition>;
    const availableButtonExtensionPoint = new RemoteMenuItemExtensionPoint(
      availableButtonStarterBrickConfig
    );

    const availableQuickbarStarterBrickConfig = starterBrickConfigFactory({
      metadata(): Metadata {
        return metadataFactory({
          id: availableQbId,
        });
      },
      definition(): QuickBarDefinition {
        return {
          type: "quickBar",
          contexts: ["all"],
          documentUrlPatterns: [testUrl],
          isAvailable: {
            matchPatterns: [testUrl],
          },
          reader: validateRegistryId("@pixiebrix/document-context"),
          targetMode: "document",
        };
      },
    }) as StarterBrickConfig<QuickBarDefinition>;
    const availableQuickbarExtensionPoint = new RemoteQuickBarExtensionPoint(
      availableQuickbarStarterBrickConfig
    );
    (getInstalledExtensionPoints as jest.Mock).mockResolvedValue([
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
      optionsActions.installCloudExtension({ extension: availableButton })
    );
    store.dispatch(
      optionsActions.installCloudExtension({ extension: unavailableButton })
    );
    store.dispatch(
      optionsActions.installCloudExtension({ extension: availableQb })
    );
    store.dispatch(
      optionsActions.installCloudExtension({ extension: unavailableQb })
    );

    await store.dispatch(actions.checkAvailableInstalledExtensions());

    const state = store.getState();

    const { availableInstalledIds, unavailableInstalledCount } =
      selectExtensionAvailability(state);

    expect(availableInstalledIds).toStrictEqual([
      availableButton.id,
      availableQb.id,
    ]);
    expect(unavailableInstalledCount).toStrictEqual(2);
  });
});
