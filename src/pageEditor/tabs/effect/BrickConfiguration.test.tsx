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
import BrickConfiguration from "./BrickConfiguration";
import brickRegistry from "@/bricks/registry";
import { echoBrick } from "@/runtime/pipelineTests/pipelineTestHelpers";
import { screen } from "@testing-library/react";
import { waitForEffect } from "@/testUtils/testHelpers";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { render } from "@/pageEditor/testHelpers";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { actions } from "@/pageEditor/slices/editorSlice";
import {
  contextMenuFormStateFactory,
  formStateFactory,
  menuItemFormStateFactory,
  quickbarFormStateFactory,
  sidebarPanelFormStateFactory,
  triggerFormStateFactory,
} from "@/testUtils/factories/pageEditorFactories";
import {
  brickConfigFactory,
  brickFactory,
} from "@/testUtils/factories/brickFactories";
import CommentEffect from "@/bricks/effects/comment";
import { propertiesToSchema } from "@/utils/schemaUtils";
import { StarterBrickTypes } from "@/types/starterBrickTypes";

beforeAll(() => {
  registerDefaultWidgets();
  // Precaution
  brickRegistry.clear();
});

afterEach(() => {
  // Being nice to other tests
  brickRegistry.clear();
});

function renderBrickConfiguration(
  element: React.ReactElement,
  initialValues: ModComponentFormState,
) {
  return render(element, {
    initialValues,
    setupRedux(dispatch) {
      dispatch(actions.addModComponentFormState(initialValues));
      dispatch(actions.setActiveModComponentId(initialValues.uuid));
      dispatch(
        actions.setActiveNodeId(
          initialValues.modComponent.brickPipeline[0].instanceId,
        ),
      );
    },
  });
}

test("renders", async () => {
  const brick = echoBrick;
  brickRegistry.register([brick]);
  const initialState = formStateFactory({ apiVersion: "v3" }, [
    brickConfigFactory({ id: brick.id }),
  ]);
  const { asFragment } = renderBrickConfiguration(
    <BrickConfiguration
      name="modComponent.brickPipeline[0]"
      brickId={brick.id}
    />,
    initialState,
  );

  await waitForEffect();

  expect(asFragment()).toMatchSnapshot();
});

describe("shows root mode", () => {
  test.each([
    [StarterBrickTypes.TRIGGER, triggerFormStateFactory],
    [StarterBrickTypes.QUICK_BAR_ACTION, quickbarFormStateFactory],
    [StarterBrickTypes.CONTEXT_MENU, contextMenuFormStateFactory],
    // Buttons must show root mode because root mode is used if the location matches multiple elements on the page
    [StarterBrickTypes.BUTTON, menuItemFormStateFactory],
  ])("shows root mode for %s", async (type, factory) => {
    const brick = echoBrick;
    brickRegistry.register([brick]);
    const initialState = factory({ apiVersion: "v3" }, [
      brickConfigFactory({ id: brick.id }),
    ]);
    renderBrickConfiguration(
      <BrickConfiguration
        name="modComponent.brickPipeline[0]"
        brickId={brick.id}
      />,
      initialState,
    );

    await waitForEffect();

    const rootModeSelect = screen.getByLabelText("Target Root Mode");

    expect(rootModeSelect).not.toBeNull();
  });

  test("don't show root mode for sidebar panel", async () => {
    const brick = echoBrick;
    brickRegistry.register([brick]);
    const initialState = sidebarPanelFormStateFactory({ apiVersion: "v3" }, [
      brickConfigFactory({ id: brick.id }),
    ]);
    renderBrickConfiguration(
      <BrickConfiguration
        name="modComponent.brickPipeline[0]"
        brickId={brick.id}
      />,
      initialState,
    );

    await waitForEffect();

    const rootModeSelect = screen.queryByLabelText("Target Root Mode");

    expect(rootModeSelect).toBeNull();
  });

  test("don't show options for comment brick", async () => {
    const brick = new CommentEffect();
    brickRegistry.register([brick]);
    const initialState = sidebarPanelFormStateFactory({ apiVersion: "v3" }, [
      brickConfigFactory({ id: brick.id }),
    ]);
    renderBrickConfiguration(
      <BrickConfiguration
        name="modComponent.brickPipeline[0]"
        brickId={brick.id}
      />,
      initialState,
    );

    await expect(
      screen.findByText("No options to show"),
    ).resolves.toBeInTheDocument();
  });
});

test.each`
  brickName      | propertyName   | expected | readableExpected
  ${"reader"}    | ${"read"}      | ${true}  | ${"should"}
  ${"effect"}    | ${"effect"}    | ${true}  | ${"should"}
  ${"transform"} | ${"transform"} | ${true}  | ${"should"}
  ${"renderer"}  | ${"render"}    | ${false} | ${"should not"}
`(
  "$readableExpected show Condition and Target settings for $brickName",
  async ({ propertyName, expected }) => {
    const brick = brickFactory({
      [propertyName]: jest.fn(),
      inputSchema: propertiesToSchema(
        {
          message: {
            type: "string",
          },
        },
        ["message"],
      ),
    });

    brickRegistry.register([brick]);
    const initialState = triggerFormStateFactory({ apiVersion: "v3" }, [
      brickConfigFactory({ id: brick.id }),
    ]);
    renderBrickConfiguration(
      <BrickConfiguration
        name="modComponent.brickPipeline[0]"
        brickId={brick.id}
      />,
      initialState,
    );

    await waitForEffect();

    const conditionInput = screen.queryByLabelText("Condition");
    const targetInput = screen.queryByLabelText("Target Tab/Frame");

    if (expected) {
      expect(conditionInput).not.toBeNull();
      expect(targetInput).not.toBeNull();
    } else {
      expect(conditionInput).toBeNull();
      expect(targetInput).toBeNull();
    }
  },
);
