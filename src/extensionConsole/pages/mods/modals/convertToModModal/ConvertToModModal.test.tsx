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

import { anonAuth } from "@/auth/authConstants";
import { authSlice } from "@/auth/authSlice";
import { render, screen } from "@/extensionConsole/testHelpers";
import extensionsSlice from "@/store/extensionsSlice";
import userEvent from "@testing-library/user-event";
import React from "react";
import { modModalsSlice } from "@/extensionConsole/pages/mods/modals/modModalsSlice";
import ConvertToModModal from "./ConvertToModModal";
import * as api from "@/data/service/api";
import {
  selectModalsContext,
  selectShowShareContext,
} from "@/extensionConsole/pages/mods/modals/modModalsSelectors";
import { type RootState } from "@/extensionConsole/store/optionsStore";
import { authStateFactory } from "@/testUtils/factories/authFactories";
import { standaloneModDefinitionFactory } from "@/testUtils/factories/modComponentFactories";
import { timestampFactory } from "@/testUtils/factories/stringFactories";

jest.mock("@/modDefinitions/modDefinitionHooks", () => ({
  useAllModDefinitions: jest.fn().mockReturnValue({ refetch: jest.fn() }),
}));

// TODO: mock the API call instead of RTK Query
jest.mock("@/data/service/api", () => {
  const originalModule = jest.requireActual("@/data/service/api");
  return {
    ...originalModule,
    useGetAllStandaloneModDefinitionsQuery: jest.fn(),
    useCreateModDefinitionMutation: jest.fn(),
    useDeleteStandaloneModDefinitionMutation: jest.fn(),
  };
});

beforeEach(() => {
  jest.mocked(api.useGetAllStandaloneModDefinitionsQuery).mockReturnValue({
    data: [],
  } as any);
  jest
    .mocked(api.useCreateModDefinitionMutation)
    .mockReturnValue([jest.fn()] as any);
  jest
    .mocked(api.useDeleteStandaloneModDefinitionMutation)
    .mockReturnValue([jest.fn()] as any);
});
afterEach(() => {
  jest.clearAllMocks();
});

describe("it renders", () => {
  test("default state", () => {
    const standaloneModDefinition = standaloneModDefinitionFactory();

    render(<ConvertToModModal />, {
      setupRedux(dispatch) {
        dispatch(authSlice.actions.setAuth(authStateFactory()));
        dispatch(
          extensionsSlice.actions.activateStandaloneModDefinition(
            standaloneModDefinition,
          ),
        );
        dispatch(
          modModalsSlice.actions.setShareContext({
            extensionId: standaloneModDefinition.id,
          }),
        );
      },
    });

    const dialogRoot = screen.getByRole("dialog");
    expect(dialogRoot).toMatchSnapshot();
  });

  test("requires user scope", async () => {
    const standaloneModDefinition = standaloneModDefinitionFactory();

    render(<ConvertToModModal />, {
      setupRedux(dispatch) {
        dispatch(authSlice.actions.setAuth(anonAuth));
        dispatch(
          extensionsSlice.actions.activateStandaloneModDefinition(
            standaloneModDefinition,
          ),
        );
        dispatch(
          modModalsSlice.actions.setShareContext({
            extensionId: standaloneModDefinition.id,
          }),
        );
      },
    });

    // Scope input field is on the screen
    const scopeInput = await screen.findAllByLabelText("Account Alias");
    expect(scopeInput).not.toBeNull();

    // Screen matches the snapshot
    const dialogRoot = screen.getByRole("dialog");
    expect(dialogRoot).toMatchSnapshot();
  });

  test.each([
    {
      name: "Share",
      sharingAction: modModalsSlice.actions.setShareContext,
      contextToBeEmpty: "showPublishContext",
      sharingContext: "showShareContext",
    },
    {
      name: "Publish",
      sharingAction: modModalsSlice.actions.setPublishContext,
      contextToBeEmpty: "showShareContext",
      sharingContext: "showPublishContext",
    },
  ] as const)(
    "opens $name modal after converting extension to blueprint",
    async ({ sharingAction, contextToBeEmpty, sharingContext }) => {
      jest.mocked(api.useCreateModDefinitionMutation).mockReturnValue([
        jest.fn().mockReturnValue({
          unwrap: jest.fn().mockResolvedValue({
            public: false,
            organizations: [],
            updated_at: timestampFactory(),
          }),
        }),
      ] as any);

      const standaloneModDefinition = standaloneModDefinitionFactory();

      const { getReduxStore } = render(
        <div>
          <ConvertToModModal />
        </div>,
        {
          setupRedux(dispatch) {
            dispatch(authSlice.actions.setAuth(authStateFactory()));
            dispatch(
              extensionsSlice.actions.activateStandaloneModDefinition(
                standaloneModDefinition,
              ),
            );
            dispatch(
              sharingAction({
                extensionId: standaloneModDefinition.id,
              }),
            );
          },
        },
      );

      const submit = await screen.findByRole("button", {
        name: "Save and Continue",
      });
      await userEvent.click(submit);

      const modalState = selectModalsContext(
        getReduxStore().getState() as RootState,
      );

      expect(modalState[contextToBeEmpty]).toBeNull();
      expect(modalState[sharingContext].extensionId).toBeUndefined();
      expect(modalState[sharingContext].blueprintId).toBeDefined();
    },
  );

  test("converts cloud mod component", async () => {
    const standaloneModDefinition = standaloneModDefinitionFactory();

    jest.mocked(api.useGetAllStandaloneModDefinitionsQuery).mockReturnValue({
      data: [standaloneModDefinition],
    } as any);
    jest
      .mocked(api.useCreateModDefinitionMutation)
      .mockReturnValue([
        jest.fn().mockReturnValue({ unwrap: jest.fn().mockResolvedValue({}) }),
      ] as any);
    const deleteCloudExtensionMock = jest
      .fn()
      .mockReturnValue({ unwrap: jest.fn().mockResolvedValue({}) });

    jest
      .mocked(api.useDeleteStandaloneModDefinitionMutation)
      .mockReturnValue([deleteCloudExtensionMock] as any);

    const { getReduxStore } = render(<ConvertToModModal />, {
      setupRedux(dispatch) {
        dispatch(authSlice.actions.setAuth(authStateFactory()));
        dispatch(
          modModalsSlice.actions.setShareContext({
            extensionId: standaloneModDefinition.id,
          }),
        );
      },
    });

    const submit = await screen.findByRole("button", {
      name: "Save and Continue",
    });
    await userEvent.click(submit);

    // The Cloud extension is deleted
    expect(deleteCloudExtensionMock).toHaveBeenCalled();

    const showShareContext = selectShowShareContext(
      getReduxStore().getState() as RootState,
    );

    expect(showShareContext.extensionId).toBeUndefined();
    expect(showShareContext.blueprintId).toBeDefined();
  });
});
