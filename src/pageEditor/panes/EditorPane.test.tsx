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
import { render, screen, within } from "@/pageEditor/testHelpers";
import EditorPane from "./EditorPane";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { selectActiveModComponentFormState } from "@/pageEditor/store/editor/editorSelectors";
import brickRegistry from "@/bricks/registry";
import { type EditorRootState } from "@/pageEditor/store/editor/pageEditorTypes";
import {
  echoBrick,
  teapotBrick,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { defaultBrickConfig } from "@/bricks/util";
import { waitForEffect } from "@/testUtils/testHelpers";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import userEvent from "@testing-library/user-event";
import { JQTransformer } from "@/bricks/transformers/jq";
import { AlertEffect } from "@/bricks/effects/alert";
import ForEach from "@/bricks/transformers/controlFlow/ForEach";
import { type OutputKey, type PipelineExpression } from "@/types/runtimeTypes";
import AddBrickModal from "@/pageEditor/modals/addBrickModal/AddBrickModal";
import { type EditablePackageMetadata } from "@/types/contract";
import { fireTextInput } from "@/testUtils/formHelpers";
import MarkdownRenderer from "@/bricks/renderers/MarkdownRenderer";
import { PIPELINE_BRICKS_FIELD_NAME } from "@/pageEditor/consts";
import getType from "@/runtime/getType";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { MULTIPLE_RENDERERS_ERROR_MESSAGE } from "@/analysis/analysisVisitors/renderersAnalysis";
import { RunProcess } from "@/contrib/uipath/process";
import { act } from "react-dom/test-utils";
import * as sinonTimers from "@sinonjs/fake-timers";
import { array } from "cooky-cutter";
import { appApiMock } from "@/testUtils/appApiMock";
import { mockAuthenticatedMeApiResponse } from "@/testUtils/userMock";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import {
  formStateFactory,
  triggerFormStateFactory,
} from "@/testUtils/factories/pageEditorFactories";
import { brickConfigFactory } from "@/testUtils/factories/brickFactories";
import {
  marketplaceListingFactory,
  marketplaceTagFactory,
} from "@/testUtils/factories/marketplaceFactories";
import { meWithPartnerApiResponseFactory } from "@/testUtils/factories/authFactories";
import { toExpression } from "@/utils/expressionUtils";
import { PipelineFlavor } from "@/bricks/types";
import {
  starterBrickDefinitionFactory,
  starterBrickDefinitionPropFactory,
} from "@/testUtils/factories/modDefinitionFactories";
import { StarterBrickTypes } from "@/types/starterBrickTypes";
import { API_PATHS } from "@/data/service/urlPaths";

/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["expect", "expectEditorError"] }] -- TODO: replace with native expect and it.each */

jest.setTimeout(15_000); // This test is flaky with the default timeout of 5000 ms

let clock: sinonTimers.InstalledClock;
async function tickAsyncEffects() {
  return act(async () => {
    await clock.tickAsync(1000);
  });
}

// Mock to support hook usage in the subtree, not relevant to UI tests here
jest.mock("@/hooks/useRefreshRegistries");

const jqBrick = new JQTransformer();
const alertBrick = new AlertEffect();
const forEachBrick = new ForEach();
const markdownBrick = new MarkdownRenderer();
const uiPathBrick = new RunProcess();

// Using events without delays with jest fake timers
const immediateUserEvent = userEvent.setup({ delay: null });

beforeAll(async () => {
  registerDefaultWidgets();

  brickRegistry.clear();

  brickRegistry.register([
    echoBrick,
    teapotBrick,
    jqBrick,
    alertBrick,
    forEachBrick,
    markdownBrick,
    uiPathBrick,
  ]);

  // Force block map to be created
  await brickRegistry.allTyped();

  const tags = [
    marketplaceTagFactory({ subtype: "role" }),
    marketplaceTagFactory({ subtype: "role" }),
    marketplaceTagFactory({ subtype: "role" }),
  ];

  const listings = array(marketplaceListingFactory, 10)({ tags });

  const packages = listings.map(
    (listing, index) =>
      ({
        id: uuidSequence(index),
        name: listing.package.name,
      }) as EditablePackageMetadata,
  );

  appApiMock.onGet(API_PATHS.MARKETPLACE_TAGS).reply(200, tags);
  appApiMock.onGet(API_PATHS.MARKETPLACE_LISTINGS).reply(200, listings);
  appApiMock.onGet(API_PATHS.BRICKS).reply(200, packages);

  clock = sinonTimers.install();
});

afterAll(() => {
  clock.uninstall();
});

beforeEach(() => {
  clock.reset();
});
afterEach(async () => clock.runAllAsync());

const getPlainFormState = (): ModComponentFormState =>
  formStateFactory({
    brickPipeline: [
      brickConfigFactory({
        id: echoBrick.id,
        outputKey: "echoOutput" as OutputKey,
        config: defaultBrickConfig(echoBrick.inputSchema),
      }),
      brickConfigFactory({
        id: teapotBrick.id,
        outputKey: "teapotOutput" as OutputKey,
        config: defaultBrickConfig(teapotBrick.inputSchema),
      }),
    ],
  });

const getSidebarPanelPlainFormState = (): ModComponentFormState =>
  formStateFactory({
    brickPipeline: [
      brickConfigFactory({
        id: echoBrick.id,
        outputKey: "echoOutput" as OutputKey,
        config: defaultBrickConfig(echoBrick.inputSchema),
      }),
      brickConfigFactory({
        id: teapotBrick.id,
        outputKey: "teapotOutput" as OutputKey,
        config: defaultBrickConfig(teapotBrick.inputSchema),
      }),
    ],
    starterBrick: starterBrickDefinitionFactory({
      definition: starterBrickDefinitionPropFactory({
        type: StarterBrickTypes.SIDEBAR_PANEL,
      }),
    }),
  });

const getFormStateWithSubPipelines = (): ModComponentFormState =>
  formStateFactory({
    brickPipeline: [
      brickConfigFactory({
        id: echoBrick.id,
        outputKey: "echoOutput" as OutputKey,
        config: defaultBrickConfig(echoBrick.inputSchema),
      }),
      brickConfigFactory({
        id: forEachBrick.id,
        outputKey: "forEachOutput" as OutputKey,
        config: {
          elements: toExpression("var", "@input.elements"),
          elementKey: "element",
          body: toExpression("pipeline", [
            brickConfigFactory({
              id: echoBrick.id,
              outputKey: "subEchoOutput" as OutputKey,
              config: {
                message: toExpression("nunjucks", "iteration {{ @element }}"),
              },
            }),
          ]),
        },
      }),
    ],
  });

const getSidebarFormStateWithSubPipelines = (): ModComponentFormState =>
  formStateFactory({
    brickPipeline: [
      brickConfigFactory({
        id: echoBrick.id,
        outputKey: "echoOutput" as OutputKey,
        config: defaultBrickConfig(echoBrick.inputSchema),
      }),
      brickConfigFactory({
        id: forEachBrick.id,
        outputKey: "forEachOutput" as OutputKey,
        config: {
          elements: toExpression("var", "@input.elements"),
          elementKey: "element",
          body: toExpression("pipeline", [
            brickConfigFactory({
              id: echoBrick.id,
              outputKey: "subEchoOutput" as OutputKey,
              config: {
                message: toExpression("nunjucks", "iteration {{ @element }}"),
              },
            }),
          ]),
        },
      }),
    ],
    starterBrick: starterBrickDefinitionFactory({
      definition: starterBrickDefinitionPropFactory({
        type: StarterBrickTypes.SIDEBAR_PANEL,
      }),
    }),
  });

async function addABlock(addButton: Element, blockName: string) {
  await immediateUserEvent.click(addButton);

  // Filter for the specified block
  await immediateUserEvent.type(
    screen.getByTestId("tag-search-input"),
    blockName,
  );

  // Run the debounced search
  await tickAsyncEffects();

  // Sometimes unexpected extra results come back in the search,
  // but the exact-match result to the search string should
  // always be first in the results grid
  await immediateUserEvent.click(
    screen.getAllByRole("button", {
      name: /^Add/,
    })[0],
  );
}

describe("renders", () => {
  beforeEach(() => {
    // :barf: these Jest snapshots contains sequence UUIDs
    formStateFactory.resetSequence();
  });

  test("the first selected node", async () => {
    const formState = getSidebarPanelPlainFormState();
    const { instanceId } = formState.modComponent.brickPipeline[0];
    const { asFragment } = render(<EditorPane />, {
      setupRedux(dispatch) {
        dispatch(editorActions.addModComponentFormState(formState));
        dispatch(editorActions.setActiveModComponentId(formState.uuid));
        dispatch(editorActions.setActiveNodeId(instanceId));
      },
    });

    await tickAsyncEffects();

    expect(asFragment()).toMatchSnapshot();
  });

  test("a mod component with sub pipeline", async () => {
    const formState = getSidebarFormStateWithSubPipelines();
    const { asFragment } = render(<EditorPane />, {
      setupRedux(dispatch) {
        dispatch(editorActions.addModComponentFormState(formState));
        dispatch(editorActions.setActiveModComponentId(formState.uuid));
      },
    });

    await tickAsyncEffects();

    expect(asFragment()).toMatchSnapshot();
  });
});

describe("can add a node", () => {
  test("to root pipeline", async () => {
    const formState = getPlainFormState();
    render(
      <>
        <EditorPane />
        <AddBrickModal />
      </>,
      {
        setupRedux(dispatch) {
          dispatch(editorActions.addModComponentFormState(formState));
          dispatch(editorActions.setActiveModComponentId(formState.uuid));
        },
      },
    );

    await waitForEffect();

    // Hitting the last (Foundation node plus 2 bricks) Add Brick button
    const addButtons = screen.getAllByTestId(/icon-button-[\w-]+-add-brick/i, {
      exact: false,
    });
    const last = addButtons.at(-1);
    await addABlock(last, "jq - json processor");

    const nodes = screen.getAllByTestId("editor-node");
    // Nodes: Foundation, 2 initial nodes, new JQ node
    expect(nodes).toHaveLength(4);

    // Selecting the last node (that was just added)
    const newNode = nodes[3];
    expect(newNode).toHaveClass("active");
    expect(newNode).toHaveTextContent(/jq - json processor/i);
  });

  test("to an empty mod component", async () => {
    const modComponentFormState = formStateFactory({
      brickPipeline: [],
    });
    render(
      <>
        <EditorPane />
        <AddBrickModal />
      </>,
      {
        setupRedux(dispatch) {
          dispatch(
            editorActions.addModComponentFormState(modComponentFormState),
          );
          dispatch(
            editorActions.setActiveModComponentId(modComponentFormState.uuid),
          );
        },
      },
    );

    await waitForEffect();

    const addButton = screen.getByTestId("icon-button-foundation-add-brick");
    await addABlock(addButton, "jq - json processor");

    const nodes = screen.getAllByTestId("editor-node");
    expect(nodes).toHaveLength(2);

    // Selecting the last node (that was just added)
    const newNode = nodes[1];
    expect(newNode).toHaveClass("active");
    expect(newNode).toHaveTextContent(/jq - json processor/i);
  });

  test("to sub pipeline", async () => {
    const modComponentFormState = getFormStateWithSubPipelines();
    const { getReduxStore } = render(
      <div>
        <EditorPane />
        <AddBrickModal />
      </div>,
      {
        setupRedux(dispatch) {
          dispatch(
            editorActions.addModComponentFormState(modComponentFormState),
          );
          dispatch(
            editorActions.setActiveModComponentId(modComponentFormState.uuid),
          );
        },
      },
    );

    await waitForEffect();

    // Adding a node at the very beginning of the sub pipeline
    const addButtonUnderSubPipelineHeader = screen.getByTestId(
      /icon-button-[\w-]+-header-add-brick/i,
    );
    await addABlock(addButtonUnderSubPipelineHeader, "jq - json processor");

    // Nodes. Root: Foundation, Echo, ForEach: new JQ node, Echo
    let nodes = screen.getAllByTestId("editor-node");
    expect(nodes).toHaveLength(5);

    // Selecting the jq - JSON processor node
    const jqNode = nodes[3];
    expect(jqNode).toHaveClass("active");
    expect(jqNode).toHaveTextContent(/jq - json processor/i);

    // Adding a node in the middle of the sub pipeline, between JQ and Echo nodes
    const reduxState = getReduxStore().getState() as EditorRootState;
    const activeModComponentFormState =
      selectActiveModComponentFormState(reduxState);
    const jqNodeId = (
      activeModComponentFormState.modComponent.brickPipeline[1].config
        .body as PipelineExpression
    ).__value__[0].instanceId;
    const addButtonInSubPipeline = screen.getByTestId(
      `icon-button-${jqNodeId}-add-brick`,
    );

    // The name of the brick is "Teapot Brick", searching for "Teapot" to get a single result in the Add Brick Dialog
    await addABlock(addButtonInSubPipeline, "Teapot");
    // Nodes. Root: Foundation, Echo, ForEach: JQ node, new Teapot node, Echo
    nodes = screen.getAllByTestId("editor-node");
    expect(nodes).toHaveLength(6);

    // Selecting the Teapot node
    const teapotNode = nodes[4];
    expect(teapotNode).toHaveClass("active");
    expect(teapotNode).toHaveTextContent(/teapot brick/i);
  });
});

async function renderEditorPaneWithBasicFormState() {
  const modComponentFormState = getFormStateWithSubPipelines();
  const activeNodeId =
    modComponentFormState.modComponent.brickPipeline[0].instanceId;
  const utils = render(
    <div>
      <EditorPane />
      <AddBrickModal />
    </div>,
    {
      setupRedux(dispatch) {
        dispatch(editorActions.addModComponentFormState(modComponentFormState));
        dispatch(
          editorActions.setActiveModComponentId(modComponentFormState.uuid),
        );
        dispatch(editorActions.setActiveNodeId(activeNodeId));
      },
    },
  );
  await waitForEffect();
  return utils;
}

describe("can remove a node", () => {
  test("from root pipeline", async () => {
    await renderEditorPaneWithBasicFormState();

    // Nodes are: Foundation, Echo, ForEach: [Echo]
    // Select the first Echo brick
    await immediateUserEvent.click(screen.getAllByText(/echo/i)[0]);

    // Click the remove button
    await immediateUserEvent.click(
      screen.getByTestId("icon-button-removeNode"),
    );

    // Expect nodes to be: Foundation, ForEach: Echo
    const nodes = screen.getAllByTestId("editor-node");
    expect(nodes).toHaveLength(3);
    expect(nodes[1]).toHaveTextContent(/for-each loop/i);
    expect(nodes[2]).toHaveTextContent(/echo/i);
  });

  test("from sub pipeline", async () => {
    await renderEditorPaneWithBasicFormState();

    // Nodes are: Foundation, Echo, ForEach: [Echo]
    // Select the second Echo block
    await immediateUserEvent.click(screen.getAllByText(/echo brick/i)[1]);

    // Click the remove button
    await immediateUserEvent.click(
      screen.getByTestId("icon-button-removeNode"),
    );

    // Expect nodes to be: Foundation, Echo, ForEach
    const nodes = screen.getAllByTestId("editor-node");
    expect(nodes).toHaveLength(3);
    expect(nodes[1]).toHaveTextContent(/echo/i);
    expect(nodes[2]).toHaveTextContent(/for-each loop/i);
  });
});

describe("can move a node up", () => {
  test("in root pipeline", async () => {
    await renderEditorPaneWithBasicFormState();

    // Nodes are: Foundation, Echo, ForEach: [Echo]
    // There should be 2 move up buttons
    const moveUpButtons = screen.getAllByTitle("Move brick higher");
    expect(moveUpButtons).toHaveLength(2);
    // First one should be disabled
    expect(moveUpButtons[0]).toBeDisabled();
    // Click the second one
    expect(moveUpButtons[1]).not.toBeDisabled();
    await immediateUserEvent.click(moveUpButtons[1]);

    // Expect nodes to now be: Foundation, ForEach: [Echo], Echo
    const nodes = screen.getAllByTestId("editor-node");
    expect(nodes).toHaveLength(4);
    expect(nodes[1]).toHaveTextContent(/for-each loop/i);
    expect(nodes[2]).toHaveTextContent(/echo/i);
    expect(nodes[3]).toHaveTextContent(/echo/i);
  });

  test("in sub pipeline", async () => {
    await renderEditorPaneWithBasicFormState();

    // Nodes are: Foundation, Echo, ForEach: [Echo]
    // There should be 5 add buttons
    const addButtons = screen.getAllByTestId(/-add-brick/i);
    expect(addButtons).toHaveLength(5);
    // Click the second-to-last one to add a brick to the sub-pipeline
    await addABlock(addButtons[3], "jq - json processor");
    // Nodes should be: Foundation, Echo, ForEach: [Echo, JQ]
    // There should be 4 move up buttons
    const moveUpButtons = screen.getAllByTitle("Move brick higher");
    expect(moveUpButtons).toHaveLength(4);
    // First one in sub-pipeline, second-to-last, should be disabled
    expect(moveUpButtons[2]).toBeDisabled();
    // Click the last one, last in sub-pipeline
    await immediateUserEvent.click(moveUpButtons[3]);
    // Expect nodes to be: Foundation, Echo, ForEach: [JQ, Echo]
    const nodes = screen.getAllByTestId("editor-node");
    expect(nodes).toHaveLength(5);
    expect(nodes[1]).toHaveTextContent(/echo/i);
    expect(nodes[2]).toHaveTextContent(/for-each loop/i);
    expect(nodes[3]).toHaveTextContent(/jq - json processor/i);
    expect(nodes[4]).toHaveTextContent(/echo/i);

    jest.useRealTimers();
  });
});

describe("can move a node down", () => {
  test("in root pipeline", async () => {
    await renderEditorPaneWithBasicFormState();

    // Nodes are: Foundation, Echo, ForEach: [Echo]
    // There should be 2 move down buttons
    const moveDownButtons = screen.getAllByTitle("Move brick lower");
    expect(moveDownButtons).toHaveLength(2);
    // Second one should be disabled
    expect(moveDownButtons[1]).toBeDisabled();
    // Click the first one
    expect(moveDownButtons[0]).not.toBeDisabled();
    await immediateUserEvent.click(moveDownButtons[0]);

    // Expect nodes to now be: Foundation, ForEach: [Echo], Echo
    const nodes = screen.getAllByTestId("editor-node");
    expect(nodes).toHaveLength(4);
    expect(nodes[1]).toHaveTextContent(/for-each loop/i);
    expect(nodes[2]).toHaveTextContent(/echo/i);
    expect(nodes[3]).toHaveTextContent(/echo/i);
  });

  test("in sub pipeline", async () => {
    await renderEditorPaneWithBasicFormState();

    // Nodes are: Foundation, Echo, ForEach: [Echo]
    // There should be 5 add buttons
    const addButtons = screen.getAllByTestId(/-add-brick/i);
    expect(addButtons).toHaveLength(5);
    // Click the second-to-last one to add a brick to the sub-pipeline
    await addABlock(addButtons[3], "jq - json processor");
    // Nodes should be: Foundation, Echo, ForEach: [Echo, JQ]
    // There should be 4 move down buttons
    const moveDownButtons = screen.getAllByTitle("Move brick lower");
    expect(moveDownButtons).toHaveLength(4);
    // Last one should be disabled
    expect(moveDownButtons[3]).toBeDisabled();
    // Click the second-to-last one, first in sub pipeline
    await immediateUserEvent.click(moveDownButtons[2]);
    // Expect nodes to be: Foundation, Echo, ForEach: [JQ, Echo]
    const nodes = screen.getAllByTestId("editor-node");
    expect(nodes).toHaveLength(5);
    expect(nodes[1]).toHaveTextContent(/echo/i);
    expect(nodes[2]).toHaveTextContent(/for-each loop/i);
    expect(nodes[3]).toHaveTextContent(/jq - json processor/i);
    expect(nodes[4]).toHaveTextContent(/echo/i);

    jest.useRealTimers();
  });
});

describe("can copy and paste a node", () => {
  test("in root pipeline", async () => {
    await renderEditorPaneWithBasicFormState();

    // Nodes are: Foundation, Echo, ForEach: [Echo]
    // Select the first Echo brick
    await immediateUserEvent.click(screen.getAllByText(/echo brick/i)[0]);

    // Click the copy button
    await immediateUserEvent.click(screen.getByTestId("icon-button-copyNode"));

    // There should be 5 paste buttons
    const pasteButtons = screen.getAllByTestId(/-paste-brick/i);
    expect(pasteButtons).toHaveLength(5);
    // Click the last one
    await immediateUserEvent.click(pasteButtons[4]);

    // Expect nodes to be: Foundation, Echo, ForEach: [Echo], Echo
    const nodes = screen.getAllByTestId("editor-node");
    expect(nodes).toHaveLength(5);
    expect(nodes[1]).toHaveTextContent(/echo/i);
    expect(nodes[2]).toHaveTextContent(/for-each loop/i);
    expect(nodes[3]).toHaveTextContent(/echo/i);
    expect(nodes[4]).toHaveTextContent(/echo/i);
  });

  test("in sub pipeline", async () => {
    await renderEditorPaneWithBasicFormState();

    // Nodes are: Foundation, Echo, ForEach: [Echo]
    // Select the first Echo brick
    await immediateUserEvent.click(screen.getAllByText(/echo brick/i)[0]);

    // Click the copy button
    await immediateUserEvent.click(screen.getByTestId("icon-button-copyNode"));

    // There should be 5 paste buttons
    const pasteButtons = screen.getAllByTestId(/-paste-brick/i);
    expect(pasteButtons).toHaveLength(5);
    // Click the second-to-last one to paste the brick inside the sub pipeline
    await immediateUserEvent.click(pasteButtons[3]);

    // Expect nodes to be: Foundation, Echo, ForEach: [Echo, Echo]
    const nodes = screen.getAllByTestId("editor-node");
    expect(nodes).toHaveLength(5);
    expect(nodes[1]).toHaveTextContent(/echo/i);
    expect(nodes[2]).toHaveTextContent(/for-each loop/i);
    expect(nodes[3]).toHaveTextContent(/echo/i);
    expect(nodes[4]).toHaveTextContent(/echo/i);
  });

  test("with sub pipelines itself", async () => {
    await renderEditorPaneWithBasicFormState();

    // Nodes are: Foundation, Echo, ForEach: [Echo]
    // Select the ForEach brick
    await immediateUserEvent.click(screen.getAllByText(/for-each loop/i)[0]);

    // Click the copy button
    await immediateUserEvent.click(screen.getByTestId("icon-button-copyNode"));

    // There should be 5 paste buttons
    const pasteButtons = screen.getAllByTestId(/-paste-brick/i);
    expect(pasteButtons).toHaveLength(5);
    // Click the last one
    await immediateUserEvent.click(pasteButtons[4]);

    // Expect nodes to be: Foundation, Echo, ForEach: [Echo], ForEach: [Echo]
    const nodes = screen.getAllByTestId("editor-node");
    expect(nodes).toHaveLength(6);
    expect(nodes[1]).toHaveTextContent(/echo/i);
    expect(nodes[2]).toHaveTextContent(/for-each loop/i);
    expect(nodes[3]).toHaveTextContent(/echo/i);
    expect(nodes[4]).toHaveTextContent(/for-each loop/i);
    expect(nodes[5]).toHaveTextContent(/echo/i);
  });
});

describe("validation", () => {
  function expectEditorError(container: HTMLElement, errorMessage: string) {
    // eslint-disable-next-line testing-library/no-node-access -- TODO: use a better selector
    const errorBadge = container.querySelector(
      '.active[data-testid="editor-node"] span.badge',
    );
    expect(errorBadge).toBeInTheDocument();

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  }

  test("validates string templates", async () => {
    const formState = getFormStateWithSubPipelines();
    const subEchoNode = (
      formState.modComponent.brickPipeline[1].config.body as PipelineExpression
    ).__value__[0];
    const { container } = render(<EditorPane />, {
      setupRedux(dispatch) {
        dispatch(editorActions.addModComponentFormState(formState));
        dispatch(editorActions.setActiveModComponentId(formState.uuid));
        dispatch(editorActions.setActiveNodeId(subEchoNode.instanceId));
      },
    });

    await tickAsyncEffects();

    // By some reason, the validation doesn't fire with userEvent.type
    fireTextInput(screen.getByLabelText("Message"), "{{!");

    // Run the timers of the Formik-Redux state synchronization and analysis
    await tickAsyncEffects();

    expectEditorError(
      container,
      "Invalid text template. Read more about text templates: https://docs.pixiebrix.com/developing-mods/developer-concepts/text-template-guide",
    );
  });

  test("preserves validation results when switching between mod components", async () => {
    // The test adds 2 mod components.
    // It creates an input field error to one node of the mod component 1,
    // then it creates a node level error on another node (adding a renderer at the beginning of the pipeline).
    // Then we select the second mod component and make sure there are no error badges displayed.
    // Going back to mod component 1.
    // See the 2 error badges in the Node Layout.
    // Select the Markdown node and check the error.
    // Select the Echo brick and check the error.

    // We need to make component one a side panel mod component
    const modComponent1 = getSidebarPanelPlainFormState();
    const modComponent2 = getPlainFormState();

    // Selecting the Echo brick in the first mod component
    const { instanceId: echoBlockInstanceId } =
      modComponent1.modComponent.brickPipeline[0];
    const { container, getReduxStore } = render(
      <>
        <EditorPane />
        <AddBrickModal />
      </>,
      {
        setupRedux(dispatch) {
          dispatch(editorActions.addModComponentFormState(modComponent1));
          dispatch(editorActions.addModComponentFormState(modComponent2));
          dispatch(editorActions.setActiveModComponentId(modComponent1.uuid));
          dispatch(editorActions.setActiveNodeId(echoBlockInstanceId));
        },
      },
    );

    await tickAsyncEffects();

    // Make invalid string template
    // This is field level error
    fireTextInput(screen.getByLabelText("Message"), "{{!");

    await tickAsyncEffects();

    // Adding a renderer in the first position in the pipeline
    // This is a node level error
    const addButtons = screen.getAllByTestId(/icon-button-[\w-]+-add-brick/i, {
      exact: false,
    });
    const addButton = addButtons.at(0);
    await addABlock(addButton, "markdown");

    // Run the timers of the Formik-Redux state synchronization and analysis
    await tickAsyncEffects();

    // Select foundation node.
    // For testing purposes we don't want a node with error to be active when we select mod component 1 again
    await immediateUserEvent.click(screen.getAllByTestId("editor-node")[0]);

    // Ensure 2 nodes have error badges
    expect(
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- TODO: use a better selector
      container.querySelectorAll('[data-testid="editor-node"] span.badge'),
    ).toHaveLength(2);

    // Selecting another mod component. Only possible with Redux
    const store = getReduxStore();
    store.dispatch(editorActions.setActiveModComponentId(modComponent2.uuid));

    // Ensure no error is displayed
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- TODO: use a better selector
    const errorBadgesOfAnotherModComponent = container.querySelectorAll(
      '[data-testid="editor-node"] span.badge',
    );
    expect(errorBadgesOfAnotherModComponent).toHaveLength(0);

    // Selecting the first mod component
    store.dispatch(editorActions.setActiveModComponentId(modComponent1.uuid));

    // Run the timers of the Formik-Redux state synchronization and analysis
    await tickAsyncEffects();

    // Should show 2 error in the Node Layout
    expect(
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- TODO: use a better selector
      container.querySelectorAll('[data-testid="editor-node"] span.badge'),
    ).toHaveLength(2);

    const editorNodes = screen.getAllByTestId("editor-node");

    // Selecting the markdown brick in the first mod component
    await immediateUserEvent.click(editorNodes[1]);

    expectEditorError(container, "A renderer must be the last brick.");

    // Selecting the echo brick
    await immediateUserEvent.click(editorNodes[2]);

    expectEditorError(
      container,
      "Invalid text template. Read more about text templates: https://docs.pixiebrix.com/developing-mods/developer-concepts/text-template-guide",
    );
  });

  test("validates multiple renderers on add", async () => {
    const formState = getSidebarPanelPlainFormState();
    formState.modComponent.brickPipeline.push(
      brickConfigFactory({
        id: MarkdownRenderer.BRICK_ID,
        config: {
          markdown: toExpression("nunjucks", "test"),
        },
      }),
    );
    const { container } = render(
      <>
        <EditorPane />
        <AddBrickModal />
      </>,
      {
        setupRedux(dispatch) {
          dispatch(editorActions.addModComponentFormState(formState));
          dispatch(editorActions.setActiveModComponentId(formState.uuid));
        },
      },
    );

    await tickAsyncEffects();

    // Hitting the second to last (Foundation node plus 2 bricks) Add Brick button
    const addButtons = screen.getAllByTestId(/icon-button-[\w-]+-add-brick/i, {
      exact: false,
    });
    const addButton = addButtons.at(0);
    await addABlock(addButton, "markdown");

    await tickAsyncEffects();

    expectEditorError(container, MULTIPLE_RENDERERS_ERROR_MESSAGE);
  });

  test("validates that renderer is the last node on move", async () => {
    const formState = getSidebarPanelPlainFormState();
    formState.modComponent.brickPipeline.push(
      brickConfigFactory({
        id: MarkdownRenderer.BRICK_ID,
        config: {
          markdown: toExpression("nunjucks", "test"),
        },
      }),
    );

    // Selecting the last node (renderer)
    const { instanceId } = formState.modComponent.brickPipeline[2];
    const { container } = render(<EditorPane />, {
      setupRedux(dispatch) {
        dispatch(editorActions.addModComponentFormState(formState));
        dispatch(editorActions.setActiveModComponentId(formState.uuid));
        dispatch(editorActions.setActiveNodeId(instanceId));
      },
    });

    await waitForEffect();

    const moveUpButton = within(
      screen.getAllByTestId("editor-node").at(-1),
    ).getByTitle("Move brick higher");

    await immediateUserEvent.click(moveUpButton);

    await tickAsyncEffects();

    expectEditorError(container, "A renderer must be the last brick.");
  });

  const disallowedBlockValidationTestCases = [
    {
      pipelineFlavor: PipelineFlavor.NoRenderer,
      formFactory: triggerFormStateFactory,
      disallowedBlock: markdownBrick,
    },
    {
      pipelineFlavor: PipelineFlavor.NoEffect,
      formFactory: () =>
        formStateFactory({
          starterBrick: starterBrickDefinitionFactory({
            definition: starterBrickDefinitionPropFactory({
              type: StarterBrickTypes.SIDEBAR_PANEL,
            }),
          }),
        }),
      disallowedBlock: alertBrick,
    },
  ];

  test.each(disallowedBlockValidationTestCases)(
    "validates a disallowed brick in $pipelineFlavor pipeline",
    async ({ formFactory, disallowedBlock }) => {
      const formState = formFactory();
      const disallowedBlockConfig = brickConfigFactory({
        id: disallowedBlock.id,
        config: defaultBrickConfig(disallowedBlock.inputSchema),
      });

      const { container } = render(<EditorPane />, {
        setupRedux(dispatch) {
          dispatch(editorActions.addModComponentFormState(formState));
          dispatch(editorActions.setActiveModComponentId(formState.uuid));
          // Adding the node will invoke validation (can't add with UI because of UI validation rules)
          dispatch(
            editorActions.addNode({
              block: disallowedBlockConfig,
              pipelinePath: PIPELINE_BRICKS_FIELD_NAME,
              pipelineIndex: 0,
            }),
          );
          dispatch(
            editorActions.setActiveNodeId(disallowedBlockConfig.instanceId),
          );
        },
      });

      await tickAsyncEffects();

      const brickType = await getType(disallowedBlock);
      expectEditorError(
        container,
        `Brick of type "${brickType}" is not allowed in this pipeline`,
      );
    },
  );
});

describe("brick validation in Add Brick Modal UI", () => {
  const testCases = [
    {
      pipelineFlavor: PipelineFlavor.NoRenderer,
      formFactory: triggerFormStateFactory,
      disallowedBlockName: "markdown",
    },
    {
      pipelineFlavor: PipelineFlavor.NoEffect,
      formFactory: () =>
        formStateFactory({
          starterBrick: starterBrickDefinitionFactory({
            definition: starterBrickDefinitionPropFactory({
              type: StarterBrickTypes.SIDEBAR_PANEL,
            }),
          }),
        }),
      disallowedBlockName: "Window Alert",
    },
  ];

  test.each(testCases)(
    "shows alert on bricks for $pipelineFlavor pipeline",
    async ({ formFactory, disallowedBlockName }) => {
      const formState = formFactory();
      render(
        <>
          <EditorPane />
          <AddBrickModal />
        </>,
        {
          setupRedux(dispatch) {
            dispatch(editorActions.addModComponentFormState(formState));
            dispatch(editorActions.setActiveModComponentId(formState.uuid));
          },
        },
      );

      await waitForEffect();

      const addBrickButton = screen.getByTestId(
        "icon-button-foundation-add-brick",
      );

      await immediateUserEvent.click(addBrickButton);

      // Try to find the disallowed brick and make sure it's not there
      await immediateUserEvent.type(
        within(screen.getByRole("dialog")).getByRole("textbox"),
        disallowedBlockName,
      );

      // Run the debounced search
      await tickAsyncEffects();

      // Check for the alert on hover
      const firstResult =
        // eslint-disable-next-line testing-library/no-node-access -- TODO: use a better selector
        screen.getAllByRole("button", { name: /add/i })[0].parentElement;
      await immediateUserEvent.hover(firstResult);
      expect(firstResult).toHaveTextContent("is not allowed in this pipeline");
    },
  );

  test("hides UiPath bricks for AA users", async () => {
    await mockAuthenticatedMeApiResponse(meWithPartnerApiResponseFactory());
    const formState = formStateFactory();
    render(
      <>
        <EditorPane />
        <AddBrickModal />
      </>,
      {
        setupRedux(dispatch) {
          dispatch(editorActions.addModComponentFormState(formState));
          dispatch(editorActions.setActiveModComponentId(formState.uuid));
        },
      },
    );

    await waitForEffect();

    const addBrickButton = screen.getByTestId(
      "icon-button-foundation-add-brick",
    );

    await immediateUserEvent.click(addBrickButton);

    // Try to find the disallowed brick and make sure it's not there
    await immediateUserEvent.type(
      within(screen.getByRole("dialog")).getByRole("textbox"),
      "uipath",
    );

    // Run the debounced search
    await tickAsyncEffects();

    const addButtons = screen.getAllByRole("button", { name: /add/i });

    // Assert that no UiPath bricks are available
    for (const button of addButtons) {
      // eslint-disable-next-line testing-library/no-node-access -- TODO: use a better selector
      const brick = button.parentElement;
      expect(brick).not.toHaveTextContent("uipath");
    }
  });
});
