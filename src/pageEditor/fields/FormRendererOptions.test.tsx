import { createNewConfiguredBrick } from "@/pageEditor/exampleBrickConfigs";
import { sidebarPanelFormStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { render } from "@/pageEditor/testHelpers";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { screen } from "@testing-library/react";
import React from "react";
import { CustomFormRenderer } from "@/bricks/renderers/customForm";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { waitForEffect } from "@/testUtils/testHelpers";
import FormRendererOptions from "@/pageEditor/fields/FormRendererOptions";
import { toggleBootstrapSwitch } from "@/testUtils/userEventHelpers";

beforeAll(() => {
  registerDefaultWidgets();
});

// TODO: figure out how to properly add to extendedExpectations
function expectToBeCollapsed(element: HTMLElement): void {
  // eslint-disable-next-line testing-library/no-node-access -- traversing known React Bootstrap structure
  const collapse = element.closest(".collapse");

  expect(collapse).toBeDefined();
  expect(collapse.classList.contains("show")).toBeFalse();
}

// TODO: figure out how to properly add to extendedExpectations
function expectToBeExpanded(element: HTMLElement): void {
  // eslint-disable-next-line testing-library/no-node-access -- traversing known React Bootstrap structure
  const collapse = element.closest(".collapse");

  expect(collapse).toBeDefined();
  expect(collapse.classList.contains("show")).toBeTrue();
}

describe("FormRendererOptions", () => {
  it("smoke test", async () => {
    const brick = createNewConfiguredBrick(CustomFormRenderer.BRICK_ID);

    const initialValues = sidebarPanelFormStateFactory({}, [brick]);

    render(
      <FormRendererOptions
        name="extension.blockPipeline.0"
        configKey="config"
      />,
      {
        initialValues,
        setupRedux(dispatch) {
          dispatch(editorActions.addModComponentFormState(initialValues));
          dispatch(editorActions.setActiveModComponentId(initialValues.uuid));
          dispatch(editorActions.setActiveNodeId(brick.instanceId));
        },
      },
    );

    await waitForEffect();

    expect(screen.getByDisplayValue("Example Notes Field")).toBeInTheDocument();
  });

  it("toggles reset field", async () => {
    const brick = createNewConfiguredBrick(CustomFormRenderer.BRICK_ID);

    const initialValues = sidebarPanelFormStateFactory({}, [brick]);

    render(
      <FormRendererOptions
        name="extension.blockPipeline.0"
        configKey="config"
      />,
      {
        initialValues,
        setupRedux(dispatch) {
          dispatch(editorActions.addModComponentFormState(initialValues));
          dispatch(editorActions.setActiveModComponentId(initialValues.uuid));
          dispatch(editorActions.setActiveNodeId(brick.instanceId));
        },
      },
    );

    await waitForEffect();

    expectToBeCollapsed(screen.getByText(/save data/i));

    await toggleBootstrapSwitch("Custom Submit Handler");

    expectToBeExpanded(screen.getByText(/save data/i));

    await toggleBootstrapSwitch("Custom Submit Handler");

    expectToBeCollapsed(screen.getByText(/save data/i));
  });

  it("toggles textarea submit toolbar", async () => {
    const brick = createNewConfiguredBrick(CustomFormRenderer.BRICK_ID);

    const initialValues = sidebarPanelFormStateFactory({}, [brick]);

    render(
      <FormRendererOptions
        name="extension.blockPipeline.0"
        configKey="config"
      />,
      {
        initialValues,
        setupRedux(dispatch) {
          dispatch(editorActions.addModComponentFormState(initialValues));
          dispatch(editorActions.setActiveModComponentId(initialValues.uuid));
          dispatch(editorActions.setActiveNodeId(brick.instanceId));
        },
      },
    );

    await waitForEffect();

    expectToBeCollapsed(screen.getByText(/select icon/i));

    await toggleBootstrapSwitch("Include Submit Toolbar?");

    expectToBeExpanded(screen.getByText(/select icon/i));

    await toggleBootstrapSwitch("Include Submit Toolbar?");

    expectToBeCollapsed(screen.getByText(/select icon/i));
  });
});
