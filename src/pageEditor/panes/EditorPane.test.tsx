/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import EditorPane from "./EditorPane";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { blockConfigFactory, formStateFactory } from "@/testUtils/factories";
import blockRegistry from "@/blocks/registry";
import { FormState } from "@/pageEditor/pageEditorTypes";
import {
  echoBlock,
  teapotBlock,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { defaultBlockConfig } from "@/blocks/util";
import { waitForEffect } from "@/testUtils/testHelpers";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import userEvent from "@testing-library/user-event";
import { JQTransformer } from "@/blocks/transformers/jq";

const jqBlock = new JQTransformer();

beforeAll(() => {
  registerDefaultWidgets();
});

describe("sanity check", () => {
  let formState: FormState;
  beforeEach(async () => {
    blockRegistry.clear();
    blockRegistry.register(echoBlock, teapotBlock, jqBlock);
    formState = formStateFactory(undefined, [
      blockConfigFactory({
        id: echoBlock.id,
        config: defaultBlockConfig(echoBlock.inputSchema),
      }),
      blockConfigFactory({
        id: teapotBlock.id,
        config: defaultBlockConfig(teapotBlock.inputSchema),
      }),
    ]);

    await blockRegistry.allTyped();
  });

  test("it renders first selected node", async () => {
    const { instanceId } = formState.extension.blockPipeline[0];
    const rendered = render(<EditorPane />, {
      setupRedux(dispatch) {
        dispatch(editorActions.addElement(formState));
        dispatch(editorActions.selectElement(formState.uuid));
        dispatch(editorActions.setElementActiveNodeId(instanceId));
      },
    });

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("can add a node", async () => {
    const rendered = render(<EditorPane />, {
      setupRedux(dispatch) {
        dispatch(editorActions.addElement(formState));
        dispatch(editorActions.selectElement(formState.uuid));
      },
    });

    await waitForEffect();

    // Hitting the last (Foundation node plus 2 bricks) Add Node button
    await userEvent.click(rendered.getByTestId("icon-button-add-node-2"));

    // Add the first (and the only) available block
    await userEvent.click(
      rendered.getByRole("button", {
        name: /add/i,
      })
    );

    // Selecting the last node
    const newNode = rendered.getAllByTestId("editor-node")[3];
    expect(newNode).toBeInTheDocument();
    expect(newNode).toHaveClass("active");
    expect(newNode).toHaveTextContent(/jq - json processor/i);
  });
});
