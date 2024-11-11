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
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { uuidv4 } from "@/types/helpers";
import { rectFactory } from "@/testUtils/factories/domFactories";
import {
  initSnippetShortcutMenuController,
  snippetRegistry,
} from "@/contentScript/snippetShortcutMenu/snippetShortcutMenuController";

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

describe("snippetShortcutMenuController", () => {
  async function triggerSnippetShortcutMenu() {
    const user = userEvent.setup();
    const textbox = screen.getByRole("textbox");
    await user.click(textbox);
    await user.type(textbox, "/");

    return user;
  }

  beforeAll(() => {
    initSnippetShortcutMenuController();
  });

  // TODO: figure out how to properly isolate tests - adding multiple tests cause flakiness
  beforeEach(async () => {
    document.body.innerHTML = '<div><input type="text" /></div>';
    snippetRegistry.clear();
  });

  // TODO: re-enable flaky test https://github.com/pixiebrix/pixiebrix-extension/issues/7682
  it.skip("attach menu when user types command key", async () => {
    snippetRegistry.register({
      componentId: uuidv4(),
      context: {},
      title: "Copy",
      shortcut: "copy",
      handler: jest.fn(),
    });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    const user = await triggerSnippetShortcutMenu();

    await expect(screen.findByRole("menu")).resolves.toBeInTheDocument();
    expect(snippetRegistry.snippetShortcuts).toHaveLength(1);

    const textbox = screen.getByRole("textbox");
    await user.type(textbox, " ");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
