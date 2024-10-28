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

import { render } from "@/pageEditor/testHelpers";
import React from "react";
import ModListingPanel from "@/pageEditor/modListingPanel/ModListingPanel";
import {
  modComponentDefinitionFactory,
  modDefinitionFactory,
} from "@/testUtils/factories/modDefinitionFactories";
import { actions as modComponentActions } from "@/store/modComponents/modComponentSlice";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { createNewUnsavedModMetadata } from "@/utils/modUtils";
import { ModalProvider } from "@/components/ConfirmationModal";
import { array } from "cooky-cutter";
import mapModDefinitionToModMetadata from "@/modDefinitions/util/mapModDefinitionToModMetadata";

/**
 * Helper to click the 3-dot menu for an item in the mod listing pane.
 */
async function clickEllipsesMenu(menuItemLabel: string): Promise<void> {
  await userEvent.click(
    screen.getByRole("button", {
      name: `${menuItemLabel} - Ellipsis`,
    }),
  );
}

async function clickMenuItemAndConfirm(actionName: string): Promise<void> {
  await userEvent.click(
    screen.getByRole("menuitem", {
      name: actionName,
    }),
  );

  // Confirm in the modal
  await userEvent.click(
    screen.getByRole("button", {
      name: actionName,
    }),
  );
}

describe("ModListingPanel", () => {
  it("renders listing for activated mod with no changes", async () => {
    const modDefinition = modDefinitionFactory();

    render(<ModListingPanel />, {
      setupRedux(dispatch) {
        dispatch(
          modComponentActions.activateMod({
            modDefinition,
            configuredDependencies: [],
            optionsArgs: {},
            screen: "pageEditor",
            isReactivate: false,
            deployment: undefined,
          }),
        );
      },
    });

    expect(screen.getByText(modDefinition.metadata.name)).toBeInTheDocument();

    // Select the mod
    await userEvent.click(screen.getByText(modDefinition.metadata.name));

    // Check that clicking expands the mod listing
    expect(
      screen.getByText(modDefinition.extensionPoints[0]!.label),
    ).toBeVisible();

    await clickEllipsesMenu(modDefinition.metadata.name);

    // "Clear Changes" is disabled because there's no dirty state
    expect(screen.getByText("Clear Changes")).toBeInTheDocument();
    expect(screen.getByText("Clear Changes")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("renders listing for unsaved mod", async () => {
    const modName = "Test Mod";

    const formState = formStateFactory({
      formStateConfig: {
        modMetadata: createNewUnsavedModMetadata({
          modName,
        }),
      },
    });

    render(<ModListingPanel />, {
      setupRedux(dispatch) {
        dispatch(editorActions.addModComponentFormState(formState));
      },
    });

    expect(screen.getByText(modName)).toBeInTheDocument();

    // Select the mod
    await userEvent.click(screen.getByText(modName));

    // Check that clicking expands the mod listing
    expect(screen.getByText(formState.label)).toBeVisible();

    await clickEllipsesMenu(modName);

    // "Clear Changes" is disabled because the mod's never been saved
    expect(screen.getByText("Clear Changes")).toBeInTheDocument();
    expect(screen.getByText("Clear Changes")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  describe("mod component actions", () => {
    it("duplicates mod component", async () => {
      const modName = "Test Mod";

      const formState = formStateFactory({
        formStateConfig: {
          modMetadata: createNewUnsavedModMetadata({
            modName,
          }),
        },
      });

      render(<ModListingPanel />, {
        setupRedux(dispatch) {
          dispatch(editorActions.addModComponentFormState(formState));
        },
      });

      // Select the mod then mod component
      await userEvent.click(screen.getByText(modName));
      await userEvent.click(screen.getByText(formState.label));

      await clickEllipsesMenu(formState.label);

      await userEvent.click(
        screen.getByRole("menuitem", {
          name: "Duplicate",
        }),
      );

      expect(screen.getByText(`${formState.label} (Copy)`)).toBeInTheDocument();
    });

    it("prevents deleting last mod component in a mod", async () => {
      const modDefinition = modDefinitionFactory();
      const componentName = modDefinition.extensionPoints[0]!.label;

      render(
        <ModalProvider>
          <ModListingPanel />
        </ModalProvider>,
        {
          setupRedux(dispatch) {
            dispatch(
              modComponentActions.activateMod({
                modDefinition,
                configuredDependencies: [],
                optionsArgs: {},
                screen: "extensionConsole",
                isReactivate: false,
                deployment: undefined,
              }),
            );
          },
        },
      );

      // Select the mod then mod component
      await userEvent.click(screen.getByText(modDefinition.metadata.name));
      await userEvent.click(screen.getByText(componentName));

      await clickEllipsesMenu(componentName);

      expect(
        screen.getByRole("menuitem", {
          name: "Delete",
        }),
      ).toHaveAttribute("aria-disabled", "true");

      expect(
        screen.getByRole("menuitem", {
          name: "Move to mod",
        }),
      ).toHaveAttribute("aria-disabled", "true");

      expect(
        screen.getByRole("menuitem", {
          name: "Copy to mod",
        }),
      ).not.toHaveAttribute("aria-disabled", "true");
    });

    it("deletes an activated mod component and undeletes on clear changes", async () => {
      const modDefinition = modDefinitionFactory({
        extensionPoints: array(modComponentDefinitionFactory, 2),
      });

      const modName = modDefinition.metadata.name;
      const componentName = modDefinition.extensionPoints[0]!.label;

      render(
        <ModalProvider>
          <ModListingPanel />
        </ModalProvider>,
        {
          setupRedux(dispatch) {
            dispatch(
              modComponentActions.activateMod({
                modDefinition,
                configuredDependencies: [],
                optionsArgs: {},
                screen: "extensionConsole",
                isReactivate: false,
                deployment: undefined,
              }),
            );
          },
        },
      );

      // Select the mod then mod component
      await userEvent.click(screen.getByText(modName));
      await userEvent.click(screen.getByText(componentName));

      await clickEllipsesMenu(componentName);

      await clickMenuItemAndConfirm("Delete");

      // Mod is still listed, but the deleted component is not
      expect(screen.getByText(modName)).toBeInTheDocument();
      expect(screen.queryByText(componentName)).not.toBeInTheDocument();

      // "Save" button is in document and enabled because mod deletion is a change
      const saveButton = screen.getByRole("button", {
        name: `${modName} - Save`,
      });
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).toBeEnabled();

      await userEvent.click(screen.getByText(modName));
      await clickEllipsesMenu(modName);

      await clickMenuItemAndConfirm("Clear Changes");

      expect(screen.getByText(componentName)).toBeInTheDocument();
    });

    it("deletes a draft mod component and keeps deleted on clear changes", async () => {
      const modDefinition = modDefinitionFactory();

      const modName = modDefinition.metadata.name;

      const formState = formStateFactory({
        formStateConfig: {
          modMetadata: mapModDefinitionToModMetadata(modDefinition),
        },
      });

      const componentName = formState.label;

      render(
        <ModalProvider>
          <ModListingPanel />
        </ModalProvider>,
        {
          setupRedux(dispatch) {
            dispatch(
              modComponentActions.activateMod({
                modDefinition,
                configuredDependencies: [],
                optionsArgs: {},
                screen: "extensionConsole",
                isReactivate: false,
                deployment: undefined,
              }),
            );

            dispatch(editorActions.addModComponentFormState(formState));
          },
        },
      );

      // Already selected because addModComponentFormState action selects it
      await clickEllipsesMenu(componentName);

      await clickMenuItemAndConfirm("Delete");

      // Mod is still listed, but the deleted component is not
      expect(screen.getByText(modName)).toBeInTheDocument();
      expect(screen.queryByText(componentName)).not.toBeInTheDocument();

      await userEvent.click(screen.getByText(modName));
      await clickEllipsesMenu(modName);

      await clickMenuItemAndConfirm("Clear Changes");

      // Should not be in document because it was a draft
      expect(screen.queryByText(componentName)).not.toBeInTheDocument();
    });
  });
});
