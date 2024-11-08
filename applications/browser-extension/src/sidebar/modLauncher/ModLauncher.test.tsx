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
import { render } from "@/sidebar/testHelpers";
import ModLauncher from "@/sidebar/modLauncher/ModLauncher";
import { screen } from "@testing-library/react";
import sidebarSlice from "@/store/sidebar/sidebarSlice";
import { sidebarEntryFactory } from "@/testUtils/factories/sidebarEntryFactories";

import { mockAllApiEndpoints } from "@/testUtils/appApiMock";

mockAllApiEndpoints();

describe("ModLauncher", () => {
  it("renders empty mod launcher", async () => {
    render(<ModLauncher />);
    await expect(
      screen.findByText("We didn't find any mods to run"),
    ).resolves.toBeInTheDocument();
  });

  it("renders panel with emoji title", async () => {
    render(<ModLauncher />, {
      setupRedux(dispatch) {
        dispatch(
          sidebarSlice.actions.setPanels({
            panels: [sidebarEntryFactory("panel", { heading: "🎁 Test Mod" })],
          }),
        );
      },
    });

    await expect(screen.findByText("Test Mod")).resolves.toBeInTheDocument();
    await expect(screen.findByText("🎁")).resolves.toBeInTheDocument();
    expect(screen.queryByText("🎁 Test Mod")).toBeNull();
  });

  it("sorts panels", async () => {
    render(<ModLauncher />, {
      setupRedux(dispatch) {
        dispatch(
          sidebarSlice.actions.setPanels({
            panels: [
              sidebarEntryFactory("panel", { heading: "🎁 Test Mod" }),
              sidebarEntryFactory("panel", { heading: "AAA Mod" }),
            ],
          }),
        );
      },
    });

    const testMod = await screen.findByText("Test Mod");
    const aaaMod = await screen.findByText("AAA Mod");

    // Reports the position of its argument node relative to the node on which it is called.
    // https://developer.mozilla.org/en-US/docs/Web/API/Node/compareDocumentPosition
    expect(aaaMod.compareDocumentPosition(testMod)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});
