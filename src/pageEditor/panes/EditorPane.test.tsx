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
import { render, screen } from "@/pageEditor/testHelpers";
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
import ForEach from "@/blocks/transformers/controlFlow/ForEach";
import {
  makePipelineExpression,
  makeTemplateExpression,
} from "@/testUtils/expressionTestHelpers";
import { fireTextInput } from "@/testUtils/formHelpers";
import { sleep } from "@/utils";

const jqBlock = new JQTransformer();
const forEachBlock = new ForEach();

beforeAll(async () => {
  registerDefaultWidgets();
  blockRegistry.clear();
  blockRegistry.register(echoBlock, teapotBlock, jqBlock, forEachBlock);
  await blockRegistry.allTyped();
});

const getPlainFormState = (): FormState =>
  formStateFactory(undefined, [
    blockConfigFactory({
      id: echoBlock.id,
      config: defaultBlockConfig(echoBlock.inputSchema),
    }),
    blockConfigFactory({
      id: teapotBlock.id,
      config: defaultBlockConfig(teapotBlock.inputSchema),
    }),
  ]);

const getFormStateWithSubPipelines = (): FormState =>
  formStateFactory(undefined, [
    blockConfigFactory({
      id: echoBlock.id,
      config: defaultBlockConfig(echoBlock.inputSchema),
    }),
    blockConfigFactory({
      id: forEachBlock.id,
      config: {
        elements: makeTemplateExpression("var", "@input.elements"),
        body: makePipelineExpression([
          {
            id: echoBlock.id,
            config: {
              message: makeTemplateExpression(
                "nunjucks",
                "iteration {{ @element }}"
              ),
            },
          },
        ]),
      },
    }),
  ]);

describe("sanity check", () => {
  test("it renders first selected node", async () => {
    const formState = getPlainFormState();
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

  test("it renders extension with sub pipeline", async () => {
    const formState = getFormStateWithSubPipelines();
    const rendered = render(<EditorPane />, {
      setupRedux(dispatch) {
        dispatch(editorActions.addElement(formState));
        dispatch(editorActions.selectElement(formState.uuid));
      },
    });

    await waitForEffect();

    // TODO fix add button: data-testid="icon-button-add-node-undefined"
    expect(rendered.asFragment()).toMatchSnapshot();
  });
});

describe("can add a node", () => {
  async function addJqBlock(addButton: Element) {
    await userEvent.click(addButton);

    // Filter for "jq - JSON processor" block
    await userEvent.type(
      screen.getByRole("dialog").querySelector(`input[name="brickSearch"]`),
      "jq - json processor"
    );

    // Wait for the debounced search. Ideally should change for jest fake timers
    await sleep(110);

    await userEvent.click(
      screen.getByRole("button", {
        name: /add/i,
      })
    );
  }

  test("to root pipeline", async () => {
    const formState = getPlainFormState();
    render(<EditorPane />, {
      setupRedux(dispatch) {
        dispatch(editorActions.addElement(formState));
        dispatch(editorActions.selectElement(formState.uuid));
      },
    });

    await waitForEffect();

    // Hitting the last (Foundation node plus 2 bricks) Add Node button
    const addButtons = screen.getAllByTestId("icon-button-add-node", {
      exact: false,
    });
    const last = addButtons[addButtons.length - 1];
    await addJqBlock(last);

    const nodes = screen.getAllByTestId("editor-node");
    // Nodes: Foundation, 2 initial nodes, new JQ node
    expect(nodes).toHaveLength(4);

    // Selecting the last node (that was just added)
    const newNode = nodes[3];
    expect(newNode).toBeInTheDocument();
    expect(newNode).toHaveClass("active");
    expect(newNode).toHaveTextContent(/jq - json processor/i);
  });

  test("to an empty extension", async () => {
    const element = formStateFactory(undefined, []);
    render(<EditorPane />, {
      setupRedux(dispatch) {
        dispatch(editorActions.addElement(element));
        dispatch(editorActions.selectElement(element.uuid));
      },
    });

    await waitForEffect();

    const addButton = screen.getByTestId("icon-button-add-node-foundation");
    await addJqBlock(addButton);

    const nodes = screen.getAllByTestId("editor-node");
    expect(nodes).toHaveLength(2);

    // Selecting the last node (that was just added)
    const newNode = nodes[1];
    expect(newNode).toBeInTheDocument();
    expect(newNode).toHaveClass("active");
    expect(newNode).toHaveTextContent(/jq - json processor/i);
  });

  test("to sub pipeline", async () => {
    const element = getFormStateWithSubPipelines();
    render(<EditorPane />, {
      setupRedux(dispatch) {
        dispatch(editorActions.addElement(element));
        dispatch(editorActions.selectElement(element.uuid));
      },
    });

    await waitForEffect();

    const addButtonUnderSubPipelineHeader = screen.getByTestId(
      /icon-button-add-node-[\w.]+-header/i
    );
    await addJqBlock(addButtonUnderSubPipelineHeader);

    const nodes = screen.getAllByTestId("editor-node");

    // Nodes. Root: Foundation, Echo, ForEach: new JQ node, Echo
    expect(nodes).toHaveLength(5);

    // Selecting the jq - JSON processor node
    const jqNode = nodes[3];
    expect(jqNode).toBeInTheDocument();
    expect(jqNode).toHaveClass("active");
    expect(jqNode).toHaveTextContent(/jq - json processor/i);
  });
});
