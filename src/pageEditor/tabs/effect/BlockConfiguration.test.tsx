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
import BlockConfiguration from "./BlockConfiguration";
import {
  blockConfigFactory,
  blockFactory,
  formStateFactory,
  triggerFormStateFactory,
  quickbarFormStateFactory,
  menuItemFormStateFactory,
  contextMenuFormStateFactory,
  sidebarPanelFormStateFactory,
} from "@/testUtils/factories";
import blockRegistry from "@/blocks/registry";
import { echoBlock } from "@/runtime/pipelineTests/pipelineTestHelpers";
import { screen } from "@testing-library/react";
import { waitForEffect } from "@/testUtils/testHelpers";
import { propertiesToSchema } from "@/validators/generic";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { render } from "@/pageEditor/testHelpers";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { actions } from "@/pageEditor/slices/editorSlice";

beforeAll(() => {
  registerDefaultWidgets();
  // Precaution
  blockRegistry.clear();
});

afterEach(() => {
  // Being nice to other tests
  blockRegistry.clear();
});

function renderBlockConfiguration(
  element: React.ReactElement,
  initialValues: FormState
) {
  return render(element, {
    initialValues,
    setupRedux(dispatch) {
      dispatch(actions.addElement(initialValues));
      dispatch(actions.selectElement(initialValues.uuid));
      dispatch(
        actions.setElementActiveNodeId(
          initialValues.extension.blockPipeline[0].instanceId
        )
      );
    },
  });
}

test("renders", async () => {
  const block = echoBlock;
  blockRegistry.register([block]);
  const initialState = formStateFactory({ apiVersion: "v3" }, [
    blockConfigFactory({ id: block.id }),
  ]);
  const rendered = renderBlockConfiguration(
    <BlockConfiguration name="extension.blockPipeline[0]" blockId={block.id} />,
    initialState
  );

  await waitForEffect();

  expect(rendered.asFragment()).toMatchSnapshot();
});

describe("shows root mode", () => {
  test.each([
    ["trigger", triggerFormStateFactory],
    ["quickBar", quickbarFormStateFactory],
    ["contextMenu", contextMenuFormStateFactory],
    // `menuItem` must show root mode because root mode is used if the location matches multiple elements on the page
    ["menuItem", menuItemFormStateFactory],
  ])("shows root mode for %s", async (type, factory) => {
    const block = echoBlock;
    blockRegistry.register([block]);
    const initialState = factory({ apiVersion: "v3" }, [
      blockConfigFactory({ id: block.id }),
    ]);
    renderBlockConfiguration(
      <BlockConfiguration
        name="extension.blockPipeline[0]"
        blockId={block.id}
      />,
      initialState
    );

    await waitForEffect();

    const rootModeSelect = screen.getByLabelText("Target Root Mode");

    expect(rootModeSelect).not.toBeNull();
  });

  test("don't show root mode for sidebar panel", async () => {
    const block = echoBlock;
    blockRegistry.register([block]);
    const initialState = sidebarPanelFormStateFactory({ apiVersion: "v3" }, [
      blockConfigFactory({ id: block.id }),
    ]);
    renderBlockConfiguration(
      <BlockConfiguration
        name="extension.blockPipeline[0]"
        blockId={block.id}
      />,
      initialState
    );

    await waitForEffect();

    const rootModeSelect = screen.queryByLabelText("Target Root Mode");

    expect(rootModeSelect).toBeNull();
  });
});

test.each`
  blockName      | propertyName   | expected | readableExpected
  ${"reader"}    | ${"read"}      | ${true}  | ${"should"}
  ${"effect"}    | ${"effect"}    | ${true}  | ${"should"}
  ${"transform"} | ${"transform"} | ${true}  | ${"should"}
  ${"renderer"}  | ${"render"}    | ${false} | ${"should not"}
`(
  "$readableExpected show Condition and Target settings for $blockName",
  async ({ propertyName, expected }) => {
    const block = blockFactory({
      [propertyName]: jest.fn(),
      inputSchema: propertiesToSchema({
        message: {
          type: "string",
        },
      }),
    });

    blockRegistry.register([block]);
    const initialState = triggerFormStateFactory({ apiVersion: "v3" }, [
      blockConfigFactory({ id: block.id }),
    ]);
    renderBlockConfiguration(
      <BlockConfiguration
        name="extension.blockPipeline[0]"
        blockId={block.id}
      />,
      initialState
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
  }
);
