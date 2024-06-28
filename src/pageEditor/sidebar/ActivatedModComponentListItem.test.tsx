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
import { render } from "@/pageEditor/testHelpers";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import ActivatedModComponentListItem from "@/pageEditor/sidebar/ActivatedModComponentListItem";
import { modComponentFactory } from "@/testUtils/factories/modComponentFactories";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { screen, waitFor } from "@testing-library/react";
import { disableOverlay, enableOverlay } from "@/contentScript/messenger/api";
import userEvent from "@testing-library/user-event";
import { StarterBrickKinds } from "@/types/starterBrickTypes";

jest.mock("@/pageEditor/starterBricks/adapter", () => {
  const actual = jest.requireActual("@/pageEditor/starterBricks/adapter");
  return {
    ...actual,
    selectType: jest.fn(async () => StarterBrickKinds.BUTTON),
  };
});

jest.mock("@/contentScript/messenger/api");

const enableOverlayMock = jest.mocked(enableOverlay);
const disableOverlayMock = jest.mocked(disableOverlay);

beforeAll(() => {
  // When a FontAwesomeIcon gets a title, it generates a random id, which breaks the snapshot.
  jest.spyOn(global.Math, "random").mockImplementation(() => 0);
});

afterAll(() => {
  jest.clearAllMocks();
});

describe("ActivatedModComponentListItem", () => {
  it("renders not active element", async () => {
    const modComponent = modComponentFactory();
    render(
      <ActivatedModComponentListItem modComponent={modComponent} isAvailable />,
    );

    const button = await screen.findByRole("button", {
      name: modComponent.label,
    });
    expect(button).toBeVisible();
    expect(button).not.toHaveClass("active");
  });

  it("renders active element", async () => {
    // Note: This is a contrived situation, because in the real app, a
    // form state element will always be created when a mod component
    // is selected (active) in the sidebar
    const modComponent = modComponentFactory();
    const formState = formStateFactory({
      uuid: modComponent.id,
    });
    render(
      <ActivatedModComponentListItem modComponent={modComponent} isAvailable />,
      {
        setupRedux(dispatch) {
          // The addElement also sets the active element
          dispatch(editorActions.addModComponentFormState(formState));
        },
      },
    );

    const button = await screen.findByRole("button", {
      name: modComponent.label,
    });
    expect(button).toBeVisible();
    // Wait for Redux side effects
    await waitFor(() => {
      expect(button).toHaveClass("active");
    });
  });

  it("shows not-available icon properly", async () => {
    const modComponent = modComponentFactory();
    render(
      <ActivatedModComponentListItem
        modComponent={modComponent}
        isAvailable={false}
      />,
    );

    await expect(
      screen.findByRole("img", { name: "Not available on page" }),
    ).resolves.toBeVisible();
  });

  it("handles mouseover action properly for button mod components", async () => {
    const modComponent = modComponentFactory();
    render(
      <ActivatedModComponentListItem modComponent={modComponent} isAvailable />,
    );

    const button = await screen.findByRole("button", {
      name: modComponent.label,
    });
    await userEvent.hover(button);

    expect(enableOverlayMock).toHaveBeenCalledTimes(1);

    await userEvent.unhover(button);

    expect(disableOverlayMock).toHaveBeenCalledTimes(1);
  });
});
