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

import {
  extensionPointConfigFactory,
  recipeDefinitionFactory,
  uuidSequence,
} from "@/testUtils/factories";
import { type WizardValues } from "@/options/pages/marketplace/wizardTypes";
import { type OutputKey, type RegistryId } from "@/core";
import { renderHook } from "@/pageEditor/testHelpers";
import useActivateRecipe from "@/hooks/useActivateRecipe";
import { validateRegistryId } from "@/types/helpers";
import { requestPermissions } from "@/utils/permissions";

jest.mock("@/utils/permissions", () => {
  const actual = jest.requireActual("@/utils/permissions");
  return {
    ...actual,
    requestPermissions: jest.fn(),
  };
});

const requestPermissionsMock = requestPermissions as jest.MockedFunction<
  typeof requestPermissions
>;

describe("useActivateRecipe", () => {
  it("returns error if permissions are not granted", async () => {
    const service1Id = "test/service1" as RegistryId;
    const service1Config = uuidSequence(1);
    const service2Id = "test/service2" as RegistryId;
    const service2Config = uuidSequence(2);

    const formValues: WizardValues = {
      extensions: {
        0: true,
        1: true,
      },
      services: [
        {
          id: service1Id,
          config: service1Config,
        },
        {
          id: service2Id,
          config: service2Config,
        },
      ],
      optionsArgs: {},
      grantPermissions: false,
    };

    const service1Key = "service1" as OutputKey;
    const extensionPointId1 = "extensionPoint1" as RegistryId;
    const extensionPoint1 = extensionPointConfigFactory({
      id: extensionPointId1,
      services: {
        [service1Key]: service1Id,
      },
    });

    const service2Key = "service2" as OutputKey;
    const extensionPointId2 = "extensionPoint2" as RegistryId;
    const extensionPoint2 = extensionPointConfigFactory({
      id: extensionPointId2,
      services: {
        [service2Key]: service2Id,
      },
    });

    const recipe = recipeDefinitionFactory({
      extensionPoints: [extensionPoint1, extensionPoint2],
      definitions: {
        [extensionPointId1]: {
          kind: "extensionPoint",
          definition: {
            type: "contextMenu",
            targetMode: "eventTarget",
            contexts: ["all"],
            documentUrlPatterns: ["*://*/*"],
            isAvailable: {
              matchPatterns: ["*://*/*"],
              selectors: [],
              urlPatterns: [],
            },
            reader: [validateRegistryId("@pixiebrix/document-metadata")],
          },
        },
        [extensionPointId2]: {
          kind: "extensionPoint",
          definition: {
            type: "actionPanel",
            trigger: "load",
            customEvent: null,
            isAvailable: {
              matchPatterns: ["*://*/*"],
              selectors: [],
              urlPatterns: [],
            },
            debounce: {
              leading: false,
              trailing: true,
              waitMillis: 250,
            },
            reader: [validateRegistryId("@pixiebrix/document-metadata")],
          },
        },
      },
    });

    requestPermissionsMock.mockResolvedValue(false);

    const { result } = renderHook(() => useActivateRecipe());

    const { success, error } = await result.current(formValues, recipe);

    expect(success).toBe(false);
    expect(error).toBe("You must accept browser permissions to activate.");
  });
});
