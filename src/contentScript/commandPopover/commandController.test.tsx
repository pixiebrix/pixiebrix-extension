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
import { screen, waitForElementToBeRemoved } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { uuidv4 } from "@/types/helpers";
import { rectFactory } from "@/testUtils/factories/domFactories";
import {
  initCommandController,
  commandRegistry,
} from "@/contentScript/commandPopover/commandController";

// I couldn't get shadow-dom-testing-library working
jest.mock("react-shadow/emotion", () => ({
  __esModule: true,
  default: {
    div(props: any) {
      return <div {...props}></div>;
    },
  },
}));

// `jsdom` does not implement full layout engine
// https://github.com/jsdom/jsdom#unimplemented-parts-of-the-web-platform
(Range.prototype.getBoundingClientRect as any) = jest.fn(() => rectFactory());
(Range.prototype.getClientRects as any) = jest.fn(() => [rectFactory()]);
(Element.prototype.scrollIntoViewIfNeeded as any) = jest.fn();

describe("commandController", () => {
  async function triggerCommandPopover() {
    const user = userEvent.setup();
    const textbox = screen.getByRole("textbox");
    await user.click(textbox);
    await user.type(textbox, "/");

    return user;
  }

  beforeAll(() => {
    initCommandController();
  });

  beforeEach(async () => {
    document.body.innerHTML = '<div><input type="text" /></div>';
    commandRegistry.clear();
  });

  it("shows popover if no actions are registered", async () => {
    const user = await triggerCommandPopover();

    await expect(screen.findByRole("menu")).resolves.toBeInTheDocument();
    await expect(
      screen.findByText("No commands found"),
    ).resolves.toBeInTheDocument();

    await user.keyboard("{Esc}");

    await waitForElementToBeRemoved(() => screen.queryByRole("menu"));
  });

  it("attach popover when user types command key", async () => {
    commandRegistry.register({
      componentId: uuidv4(),
      title: "Copy",
      shortcut: "copy",
      handler: jest.fn(),
    });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    const user = await triggerCommandPopover();

    await expect(screen.findByRole("menu")).resolves.toBeInTheDocument();
    expect(commandRegistry.commands).toHaveLength(1);

    const textbox = screen.getByRole("textbox");
    await user.type(textbox, " ");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
