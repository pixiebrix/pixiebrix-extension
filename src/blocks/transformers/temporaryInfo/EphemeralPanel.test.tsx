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

import React from "react";
import { render } from "@testing-library/react";
import EphemeralPanel from "@/blocks/transformers/temporaryInfo/EphemeralPanel";
import { uuidv4 } from "@/types/helpers";
import { JSDOM } from "jsdom";
import useTemporaryPanelDefinition from "@/blocks/transformers/temporaryInfo/useTemporaryPanelDefinition";
import { waitForEffect } from "@/testUtils/testHelpers";

jest.mock(
  "@/blocks/transformers/temporaryInfo/useTemporaryPanelDefinition",
  () => ({
    __esModule: true,
    default: jest.fn(),
  })
);

const useTemporaryPanelDefinitionMock =
  useTemporaryPanelDefinition as jest.MockedFunction<
    typeof useTemporaryPanelDefinition
  >;

describe("EphemeralPanel", () => {
  beforeEach(() => {
    useTemporaryPanelDefinitionMock.mockReset();
  });

  test.each(["modal", "popover"])("renders blank: %s", async (mode) => {
    const dom = new JSDOM();
    dom.reconfigure({
      url: `chrome-extension://abc/ephemeralPanel.html?mode=${mode}&frameNonce=${uuidv4()}`,
    });

    useTemporaryPanelDefinitionMock.mockReturnValue({
      entry: null,
      error: null,
      isLoading: null,
    });

    const rendered = render(<EphemeralPanel />);

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test.each(["modal", "popover"])("renders error state: %s", async (mode) => {
    const dom = new JSDOM();
    dom.reconfigure({
      url: `chrome-extension://abc/ephemeralPanel.html?mode=${mode}&frameNonce=${uuidv4()}`,
    });

    useTemporaryPanelDefinitionMock.mockReturnValue({
      entry: null,
      error: new Error("test error"),
      isLoading: null,
    });

    const rendered = render(<EphemeralPanel />);

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });
});
