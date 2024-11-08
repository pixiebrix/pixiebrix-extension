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
import { render, screen } from "@testing-library/react";
import EphemeralPanel from "./EphemeralPanel";
import { uuidv4 } from "../../../types/helpers";
import useTemporaryPanelDefinition from "./useTemporaryPanelDefinition";
import { waitForEffect } from "../../../testUtils/testHelpers";
import {
  cancelTemporaryPanel,
  resolveTemporaryPanel,
} from "../../../contentScript/messenger/api";

import { sidebarEntryFactory } from "../../../testUtils/factories/sidebarEntryFactories";
import userEvent from "@testing-library/user-event";

jest.mock("./useTemporaryPanelDefinition");

jest.mock("../../../contentScript/messenger/api");

jest.mock("../../../sidebar/PanelBody", () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="panel-body"></div>),
}));

const useTemporaryPanelDefinitionMock = jest.mocked(
  useTemporaryPanelDefinition,
);

const cancelTemporaryPanelMock = jest.mocked(cancelTemporaryPanel);
const resolveTemporaryPanelMock = jest.mocked(resolveTemporaryPanel);

describe("EphemeralPanel", () => {
  beforeEach(() => {
    useTemporaryPanelDefinitionMock.mockReset();
    cancelTemporaryPanelMock.mockReset();
    resolveTemporaryPanelMock.mockReset();
  });

  test.each(["modal", "popover"])("renders blank: %s", async (mode) => {
    location.href = `chrome-extension://abc/ephemeralPanel.html?mode=${mode}&frameNonce=${uuidv4()}`;

    useTemporaryPanelDefinitionMock.mockReturnValue({
      panelNonce: null,
      entry: null,
      error: null,
      isLoading: false,
    });

    const { asFragment } = render(<EphemeralPanel />);

    await waitForEffect();

    expect(asFragment()).toMatchSnapshot();
  });

  test.each(["modal", "popover"])("renders error state: %s", async (mode) => {
    location.href = `chrome-extension://abc/ephemeralPanel.html?mode=${mode}&frameNonce=${uuidv4()}`;

    useTemporaryPanelDefinitionMock.mockReturnValue({
      panelNonce: uuidv4(),
      entry: null,
      error: new Error("test error"),
      isLoading: false,
    });

    const { asFragment } = render(<EphemeralPanel />);

    await waitForEffect();

    expect(asFragment()).toMatchSnapshot();

    await userEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(cancelTemporaryPanelMock).toHaveBeenCalled();
  });

  test.each(["modal", "popover"])(
    "renders action buttons: %s",
    async (mode) => {
      location.href = `chrome-extension://abc/ephemeralPanel.html?mode=${mode}&frameNonce=${uuidv4()}`;

      const panelNonce = uuidv4();

      useTemporaryPanelDefinitionMock.mockReturnValue({
        panelNonce,
        entry: sidebarEntryFactory("temporaryPanel", {
          nonce: panelNonce,
          actions: [{ type: "testClick", variant: "light" }],
        }),
        error: null,
        isLoading: false,
      });

      const { asFragment } = render(<EphemeralPanel />);

      await waitForEffect();

      expect(asFragment()).toMatchSnapshot();

      await userEvent.click(
        screen.getByRole("button", { name: /test click/i }),
      );

      expect(cancelTemporaryPanelMock).not.toHaveBeenCalled();
      expect(resolveTemporaryPanelMock).toHaveBeenCalledWith(null, panelNonce, {
        type: "testClick",
        variant: "light",
      });
    },
  );
});
