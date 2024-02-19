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

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { uuidv4 } from "@/types/helpers";
import { waitForEffect } from "@/testUtils/testHelpers";
import { rectFactory } from "@/testUtils/factories/domFactories";
import type * as controllerModule from "@/contentScript/commandPopover/commandController";

document.body.innerHTML = '<div><input type="text" /></div>';

// `jsdom` does not implement full layout engine
// https://github.com/jsdom/jsdom#unimplemented-parts-of-the-web-platform
(Range.prototype.getBoundingClientRect as any) = jest.fn(() => rectFactory());
(Range.prototype.getClientRects as any) = jest.fn(() => [rectFactory()]);

describe("commandController", () => {
  let module: typeof controllerModule;

  async function triggerCommandPopover() {
    const user = userEvent.setup();
    const textbox = screen.getByRole("textbox");
    await user.click(textbox);
    await user.type(textbox, "/");
    await waitForEffect();
  }

  beforeEach(async () => {
    jest.resetModules();
    module = await import("@/contentScript/commandPopover/commandController");
  });

  it("don't show popover if no actions are registered", async () => {
    module.initCommandController();
    await triggerCommandPopover();
    expect(
      screen.queryByTestId("pixiebrix-command-popover"),
    ).not.toBeInTheDocument();
  });

  it("attach popover when user types command key", async () => {
    module.initCommandController();

    module.commandRegistry.register({
      componentId: uuidv4(),
      title: "Copy",
      shortcut: "copy",
      handler: jest.fn(),
    });

    await triggerCommandPopover();

    expect(
      // The popover is getting added and then immediately destroyed. For now just check that the tooltips container
      // for floating-ui has been added. The controller needs to be E2E tested anyway because it relies on selection
      // API and document.execCommand which are not meaningfully available in JSDOM.
      // eslint-disable-next-line testing-library/no-node-access -- see comment
      document.querySelector("#pb-tooltips-container"),
    ).toBeInTheDocument();
  });
});
