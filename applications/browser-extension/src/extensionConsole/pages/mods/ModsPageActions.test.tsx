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

import React from "react";
import { useHistory } from "react-router";
import { deactivateMod } from "../../../store/deactivateModHelpers";
import { render, screen } from "../../testHelpers";
import ModsPageActions from "./ModsPageActions";
import { modViewItemFactory } from "../../../testUtils/factories/modViewItemFactory";
import { appApiMock } from "../../../testUtils/appApiMock";
import { userEvent } from "../../../pageEditor/testHelpers";
import { type ModActionsEnabled } from "../../../types/modTypes";
import { type RootState } from "../../store";
import {
  modComponentDefinitionFactory,
  modDefinitionFactory,
} from "../../../testUtils/factories/modDefinitionFactories";
import { array } from "cooky-cutter";
import modComponentSlice from "../../../store/modComponents/modComponentSlice";
import { API_PATHS, UI_PATHS } from "../../../data/service/urlPaths";

jest.mock("react-router", () => {
  const actual = jest.requireActual("react-router");
  return {
    ...actual,
    useHistory: jest.fn(),
  };
});

jest.mock("../../../store/deactivateModHelpers", () => ({
  deactivateMod: jest.fn(),
}));

jest.mock("../../../components/ConfirmationModal", () => {
  const actual = jest.requireActual("@/components/ConfirmationModal");
  return {
    ...actual,
    useModals: jest.fn().mockReturnValue({
      showConfirmation: jest.fn().mockReturnValue(true),
    }),
  };
});

const historyPushMock = jest.fn();

describe("ModsPageActions", () => {
  beforeAll(() => {
    jest
      .mocked(useHistory)
      .mockReturnValue({ push: historyPushMock } as unknown as ReturnType<
        typeof useHistory
      >);
  });

  beforeEach(() => {
    historyPushMock.mockReset();
    appApiMock.reset();
  });

  it("renders all menu items when all show flags are true", async () => {
    render(<ModsPageActions modViewItem={modViewItemFactory()} />);

    // Open the menu
    await userEvent.click(screen.getByTestId("ellipsis-menu-button"));

    expect(screen.getByText("Publish to Marketplace")).toBeInTheDocument();
    expect(screen.getByText("View Mod Details")).toBeInTheDocument();
    expect(screen.getByText("Share with Teams")).toBeInTheDocument();
    expect(screen.getByText("View Logs")).toBeInTheDocument();
    expect(screen.getByText("Edit in Workshop")).toBeInTheDocument();
    expect(screen.getByText("Reactivate")).toBeInTheDocument();
    expect(screen.getByText("Deactivate")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  test.each`
    hideFlag                      | missingText
    ${"showPublishToMarketplace"} | ${"Publish to Marketplace"}
    ${"showViewDetails"}          | ${"View Mod Details"}
    ${"showShareWithTeams"}       | ${"Share with Teams"}
    ${"showViewLogs"}             | ${"View Logs"}
    ${"showEditInWorkshop"}       | ${"Edit in Workshop"}
    ${"showReactivate"}           | ${"Reactivate"}
    ${"showDeactivate"}           | ${"Deactivate"}
    ${"showDelete"}               | ${"Delete"}
  `(
    "does not render menu item when $hideFlag is false",
    async ({
      hideFlag,
      missingText,
    }: {
      hideFlag: keyof ModActionsEnabled;
      missingText: string;
    }) => {
      const modViewItem = modViewItemFactory();
      modViewItem.modActions[hideFlag] = false;
      render(<ModsPageActions modViewItem={modViewItem} />);

      // Open the menu
      await userEvent.click(screen.getByTestId("ellipsis-menu-button"));

      expect(screen.queryByText(missingText)).not.toBeInTheDocument();
    },
  );

  it("dispatches setPublishContext action when Publish to Marketplace is clicked", async () => {
    const modViewItem = modViewItemFactory();
    const { getReduxStore } = render(
      <ModsPageActions modViewItem={modViewItem} />,
    );

    // Open the menu
    await userEvent.click(screen.getByTestId("ellipsis-menu-button"));

    await userEvent.click(screen.getByText("Publish to Marketplace"));

    // Check publish context was set
    const { modModals } = getReduxStore().getState() as RootState;
    expect(modModals.showPublishContext).toEqual({ modId: modViewItem.modId });
  });

  it("navigates to marketplace listing URL when View Mod Details is clicked", async () => {
    const modViewItem = modViewItemFactory();
    render(<ModsPageActions modViewItem={modViewItem} />);

    // Open the menu
    await userEvent.click(screen.getByTestId("ellipsis-menu-button"));

    // Expect to find a link on the page with text "View Mod Details", an anchor element with role="menuitem"
    const viewDetailsLink = screen.getByRole("menuitem", {
      name: "View Mod Details",
    });
    expect(viewDetailsLink).toBeInTheDocument();
  });

  it("dispatches setShareContext action when Share with Teams is clicked", async () => {
    const modViewItem = modViewItemFactory();
    const { getReduxStore } = render(
      <ModsPageActions modViewItem={modViewItem} />,
    );

    // Open the menu
    await userEvent.click(screen.getByTestId("ellipsis-menu-button"));

    await userEvent.click(screen.getByText("Share with Teams"));

    // Check share context was set
    const { modModals } = getReduxStore().getState() as RootState;
    expect(modModals.showShareContext).toEqual({ modId: modViewItem.modId });
  });

  it("dispatches setLogsContext action when View Logs is clicked", async () => {
    const modViewItem = modViewItemFactory();
    const { getReduxStore } = render(
      <ModsPageActions modViewItem={modViewItem} />,
    );

    // Open the menu
    await userEvent.click(screen.getByTestId("ellipsis-menu-button"));

    await userEvent.click(screen.getByText("View Logs"));

    // Check logs context was set
    const { modModals } = getReduxStore().getState() as RootState;
    expect(modModals.showLogsContext).toEqual({
      title: modViewItem.name,
      messageContext: { label: modViewItem.name, modId: modViewItem.modId },
    });
  });

  it("navigates to workshop URL when Edit in Workshop is clicked", async () => {
    const modViewItem = modViewItemFactory();
    render(<ModsPageActions modViewItem={modViewItem} />);

    // Open the menu
    await userEvent.click(screen.getByTestId("ellipsis-menu-button"));

    await userEvent.click(screen.getByText("Edit in Workshop"));

    expect(historyPushMock).toHaveBeenCalledWith(
      `/workshop/bricks/${modViewItem.editablePackageId}`,
    );
  });

  it("navigates to activate URL when Reactivate is clicked", async () => {
    const modViewItem = modViewItemFactory();
    render(<ModsPageActions modViewItem={modViewItem} />);

    // Open the menu
    await userEvent.click(screen.getByTestId("ellipsis-menu-button"));

    await userEvent.click(screen.getByText("Reactivate"));

    expect(historyPushMock).toHaveBeenCalledWith(
      UI_PATHS.MOD_ACTIVATE(modViewItem.modId, true),
    );
  });

  it("calls deactivateMod when Deactivate is clicked", async () => {
    const modDefinition = modDefinitionFactory({
      extensionPoints: array(modComponentDefinitionFactory, 3),
    });
    const modViewItem = modViewItemFactory({
      modId: modDefinition.metadata.id,
    });
    render(<ModsPageActions modViewItem={modViewItem} />, {
      setupRedux(dispatch) {
        dispatch(
          modComponentSlice.actions.activateMod({
            modDefinition,
            screen: "extensionConsole",
            isReactivate: false,
          }),
        );
      },
    });

    // Open the menu
    await userEvent.click(screen.getByTestId("ellipsis-menu-button"));

    await userEvent.click(screen.getByText("Deactivate"));

    expect(deactivateMod).toHaveBeenCalledWith(
      modViewItem.modId,
      expect.toBeArrayOfSize(3),
    );
  });

  it("calls deleteModPackage when Delete is clicked", async () => {
    appApiMock.onDelete().reply(200);

    const modViewItem = modViewItemFactory();
    render(<ModsPageActions modViewItem={modViewItem} />);

    // Open the menu
    await userEvent.click(screen.getByTestId("ellipsis-menu-button"));

    await userEvent.click(screen.getByText("Delete"));

    expect(appApiMock.history.delete).toBeArrayOfSize(1);
    expect(appApiMock.history.delete[0]!.url).toBe(
      API_PATHS.BRICK(String(modViewItem.editablePackageId)),
    );
  });
});
