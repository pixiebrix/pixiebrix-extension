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

import { anonAuth } from "@/auth/authConstants";
import { authSlice } from "@/auth/authSlice";
import { render, screen } from "@/extensionConsole/testHelpers";
import extensionsSlice from "@/store/extensionsSlice";
import userEvent from "@testing-library/user-event";
import React from "react";
import { modModalsSlice } from "@/extensionConsole/pages/mods/modals/modModalsSlice";
import ConvertToRecipeModal from "./ConvertToRecipeModal";
import * as api from "@/services/api";
import {
  selectModalsContext,
  selectShowShareContext,
} from "@/extensionConsole/pages/mods/modals/modModalsSelectors";
import { type RootState } from "@/store/optionsStore";
import { authStateFactory } from "@/testUtils/factories/authFactories";
import { standaloneModDefinitionFactory } from "@/testUtils/factories/modComponentFactories";

jest.mock("@/modDefinitions/modDefinitionHooks", () => ({
  useAllModDefinitions: jest.fn().mockReturnValue({ refetch: jest.fn() }),
}));

jest.mock("@/services/api", () => {
  const originalModule = jest.requireActual("@/services/api");
  return {
    ...originalModule,
    useGetAllCloudExtensionsQuery: jest.fn(),
    useCreateRecipeMutation: jest.fn(),
    useDeleteCloudExtensionMutation: jest.fn(),
  };
});

beforeEach(() => {
  (api.useGetAllCloudExtensionsQuery as jest.Mock).mockReturnValue({
    data: [],
  });
  (api.useCreateRecipeMutation as jest.Mock).mockReturnValue([jest.fn()]);
  (api.useDeleteCloudExtensionMutation as jest.Mock).mockReturnValue([
    jest.fn(),
  ]);
});
afterEach(() => {
  jest.clearAllMocks();
});

describe("it renders", () => {
  test("default state", () => {
    const standaloneModDefinition = standaloneModDefinitionFactory();

    render(<ConvertToRecipeModal />, {
      setupRedux(dispatch) {
        dispatch(authSlice.actions.setAuth(authStateFactory()));
        dispatch(
          extensionsSlice.actions.installCloudExtension({
            extension: standaloneModDefinition,
          }),
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

    render(<ConvertToRecipeModal />, {
      setupRedux(dispatch) {
        dispatch(authSlice.actions.setAuth(anonAuth));
        dispatch(
          extensionsSlice.actions.installCloudExtension({
            extension: standaloneModDefinition,
          }),
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
      (api.useCreateRecipeMutation as jest.Mock).mockReturnValue([
        jest.fn().mockReturnValue({
          unwrap: jest.fn().mockResolvedValue({
            public: false,
            organizations: [],
            updated_at: new Date().toISOString(),
          }),
        }),
      ]);

      const standaloneModDefinition = standaloneModDefinitionFactory();

      const { getReduxStore } = render(
        <div>
          <ConvertToRecipeModal />
        </div>,
        {
          setupRedux(dispatch) {
            dispatch(authSlice.actions.setAuth(authStateFactory()));
            dispatch(
              extensionsSlice.actions.installCloudExtension({
                extension: standaloneModDefinition,
              }),
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

    (api.useGetAllCloudExtensionsQuery as jest.Mock).mockReturnValue({
      data: [standaloneModDefinition],
    });
    (api.useCreateRecipeMutation as jest.Mock).mockReturnValue([
      jest.fn().mockReturnValue({ unwrap: jest.fn().mockResolvedValue({}) }),
    ]);
    const deleteCloudExtensionMock = jest
      .fn()
      .mockReturnValue({ unwrap: jest.fn().mockResolvedValue({}) });

    (api.useDeleteCloudExtensionMutation as jest.Mock).mockReturnValue([
      deleteCloudExtensionMock,
    ]);

    const { getReduxStore } = render(<ConvertToRecipeModal />, {
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
