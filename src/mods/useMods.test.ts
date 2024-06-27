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

import { renderHook } from "@/extensionConsole/testHelpers";
import useMods from "@/mods/useMods";
import extensionsSlice from "@/store/extensionsSlice";
import { validateTimestamp } from "@/types/helpers";
import { useAllModDefinitions } from "@/modDefinitions/modDefinitionHooks";
import { range } from "lodash";
import { appApiMock } from "@/testUtils/appApiMock";
import {
  standaloneModDefinitionFactory,
  activatedModComponentFactory,
} from "@/testUtils/factories/modComponentFactories";
import { defaultModDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { type UseCachedQueryResult } from "@/types/sliceTypes";
import { metadataFactory } from "@/testUtils/factories/metadataFactory";
import { DefinitionKinds } from "@/types/registryTypes";

jest.mock("@/modDefinitions/modDefinitionHooks");

const useAllModDefinitionsMock = jest.mocked(useAllModDefinitions);

describe("useMods", () => {
  beforeEach(() => {
    appApiMock.reset();
    appApiMock.onGet("/api/extensions/").reply(200, []);

    useAllModDefinitionsMock.mockReset();
    useAllModDefinitionsMock.mockReturnValue({
      data: undefined,
    } as UseCachedQueryResult<ModDefinition[]>);
  });

  it("handles empty state", async () => {
    const wrapper = renderHook(() => useMods());

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
      mods: [],
      error: undefined,
    });
  });

  it("handles unavailable", async () => {
    const wrapper = renderHook(() => useMods(), {
      setupRedux(dispatch) {
        dispatch(
          extensionsSlice.actions.UNSAFE_setModComponents([
            activatedModComponentFactory({
              _recipe: {
                ...metadataFactory(),
                updated_at: validateTimestamp(new Date().toISOString()),
                sharing: { public: false, organizations: [] },
              },
            }),
          ]),
        );
      },
    });

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
      mods: [
        expect.objectContaining({
          isStub: true,
        }),
      ],
      error: undefined,
    });
  });

  it("multiple unavailable are single mod", async () => {
    const metadata = metadataFactory();

    const wrapper = renderHook(() => useMods(), {
      setupRedux(dispatch) {
        dispatch(
          extensionsSlice.actions.UNSAFE_setModComponents(
            range(3).map(() =>
              activatedModComponentFactory({
                _recipe: {
                  ...metadata,
                  updated_at: validateTimestamp(new Date().toISOString()),
                  sharing: { public: false, organizations: [] },
                },
              }),
            ),
          ),
        );
      },
    });

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
      mods: [
        expect.objectContaining({
          isStub: true,
        }),
      ],
      error: undefined,
    });
  });

  it("handles known recipe", async () => {
    const metadata = metadataFactory();

    useAllModDefinitionsMock.mockReturnValue({
      data: [defaultModDefinitionFactory({ metadata })],
      error: undefined,
    } as UseCachedQueryResult<ModDefinition[]>);

    const wrapper = renderHook(() => useMods(), {
      setupRedux(dispatch) {
        dispatch(
          extensionsSlice.actions.UNSAFE_setModComponents([
            activatedModComponentFactory({
              _recipe: {
                ...metadata,
                updated_at: validateTimestamp(new Date().toISOString()),
                sharing: { public: false, organizations: [] },
              },
            }),
          ]),
        );
      },
    });

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
      mods: [
        expect.objectContaining({
          kind: DefinitionKinds.MOD,
        }),
      ],
      error: undefined,
    });

    expect(wrapper.result.current.mods[0]).not.toHaveProperty("isStub");
  });

  it("handles inactive cloud extension", async () => {
    appApiMock
      .onGet("/api/extensions/")
      .reply(200, [standaloneModDefinitionFactory()]);

    const wrapper = renderHook(() => useMods());

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
      mods: [
        expect.objectContaining({
          active: false,
          extensionPointId: expect.toBeString(),
        }),
      ],
      error: undefined,
    });
  });

  it("handles active cloud extension", async () => {
    appApiMock.reset();

    const standaloneModDefinition = standaloneModDefinitionFactory();
    appApiMock.onGet("/api/extensions/").reply(200, [standaloneModDefinition]);

    const wrapper = renderHook(() => useMods(), {
      setupRedux(dispatch) {
        dispatch(
          extensionsSlice.actions.UNSAFE_setModComponents([
            // Content doesn't matter, just need to match the ID
            activatedModComponentFactory({ id: standaloneModDefinition.id }),
          ]),
        );
      },
    });

    await wrapper.waitForEffect();

    expect(wrapper.result.current).toEqual({
      mods: [
        expect.objectContaining({
          active: true,
          extensionPointId: expect.toBeString(),
        }),
      ],
      error: undefined,
    });
  });
});
