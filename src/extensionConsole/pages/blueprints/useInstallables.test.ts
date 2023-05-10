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

import { renderHook } from "@/extensionConsole/testHelpers";
import useInstallables from "@/extensionConsole/pages/blueprints/useInstallables";
import extensionsSlice from "@/store/extensionsSlice";
import { useGetAllCloudExtensionsQuery } from "@/services/api";
import {
  cloudExtensionFactory,
  persistedExtensionFactory,
  recipeDefinitionFactory,
  recipeMetadataFactory,
} from "@/testUtils/factories";
import { validateTimestamp } from "@/types/helpers";
import { useAllRecipes } from "@/recipes/recipesHooks";
import { range } from "lodash";

jest.mock("@/services/api", () => ({
  useGetAllCloudExtensionsQuery: jest.fn(),
}));

jest.mock("@/recipes/recipesHooks", () => ({
  useAllRecipes: jest.fn(),
}));

const useGetAllCloudExtensionsQueryMock =
  useGetAllCloudExtensionsQuery as jest.MockedFunction<
    typeof useGetAllCloudExtensionsQuery
  >;
const useAllRecipesMock = useAllRecipes as jest.MockedFunction<
  typeof useAllRecipes
>;

describe("useInstallables", () => {
  beforeEach(() => {
    useGetAllCloudExtensionsQueryMock.mockReset();
    useGetAllCloudExtensionsQueryMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: false,
      refetch: jest.fn(),
    });

    useAllRecipesMock.mockReset();
    useAllRecipesMock.mockReturnValue({ data: undefined } as any);
  });

  it("handles empty state", async () => {
    const wrapper = renderHook(() => useInstallables());

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
      installables: [],
      error: false,
    });
  });

  it("handles unavailable", async () => {
    const wrapper = renderHook(() => useInstallables(), {
      setupRedux(dispatch) {
        dispatch(
          // eslint-disable-next-line new-cap -- unsave
          extensionsSlice.actions.UNSAFE_setExtensions([
            persistedExtensionFactory({
              _recipe: {
                ...recipeMetadataFactory(),
                updated_at: validateTimestamp(new Date().toISOString()),
                sharing: { public: false, organizations: [] },
              },
            }),
          ])
        );
      },
    });

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
      installables: [
        expect.objectContaining({
          isStub: true,
        }),
      ],
      error: false,
    });
  });

  it("multiple unavailable are single installable", async () => {
    const metadata = recipeMetadataFactory();

    const wrapper = renderHook(() => useInstallables(), {
      setupRedux(dispatch) {
        dispatch(
          // eslint-disable-next-line new-cap -- unsave
          extensionsSlice.actions.UNSAFE_setExtensions(
            range(3).map(() =>
              persistedExtensionFactory({
                _recipe: {
                  ...metadata,
                  updated_at: validateTimestamp(new Date().toISOString()),
                  sharing: { public: false, organizations: [] },
                },
              })
            )
          )
        );
      },
    });

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
      installables: [
        expect.objectContaining({
          isStub: true,
        }),
      ],
      error: false,
    });
  });

  it("handles known recipe", async () => {
    const metadata = recipeMetadataFactory();

    useAllRecipesMock.mockReturnValue({
      data: [recipeDefinitionFactory({ metadata })],
      error: undefined,
    } as any);

    const wrapper = renderHook(() => useInstallables(), {
      setupRedux(dispatch) {
        dispatch(
          // eslint-disable-next-line new-cap -- test setup
          extensionsSlice.actions.UNSAFE_setExtensions([
            persistedExtensionFactory({
              _recipe: {
                ...metadata,
                updated_at: validateTimestamp(new Date().toISOString()),
                sharing: { public: false, organizations: [] },
              },
            }),
          ])
        );
      },
    });

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
      installables: [
        expect.objectContaining({
          kind: "recipe",
        }),
      ],
      error: false,
    });

    expect(wrapper.result.current.installables[0]).not.toHaveProperty("isStub");
  });

  it("handles inactive cloud extension", async () => {
    useGetAllCloudExtensionsQueryMock.mockReturnValue({
      data: [cloudExtensionFactory()],
      isLoading: false,
      error: false,
      refetch: jest.fn(),
    });

    const wrapper = renderHook(() => useInstallables());

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
      installables: [
        expect.objectContaining({
          active: false,
          extensionPointId: expect.toBeString(),
        }),
      ],
      error: false,
    });
  });

  it("handles active cloud extension", async () => {
    const cloudExtension = cloudExtensionFactory();

    useGetAllCloudExtensionsQueryMock.mockReturnValue({
      data: [cloudExtension],
      error: false,
      refetch: jest.fn(),
    });

    const wrapper = renderHook(() => useInstallables(), {
      setupRedux(dispatch) {
        dispatch(
          // eslint-disable-next-line new-cap -- test setup
          extensionsSlice.actions.UNSAFE_setExtensions([
            // Content doesn't matter, just need to match the ID
            persistedExtensionFactory({ id: cloudExtension.id }),
          ])
        );
      },
    });

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
      installables: [
        expect.objectContaining({
          active: true,
          extensionPointId: expect.toBeString(),
        }),
      ],
      error: false,
    });
  });
});
