import { createNewConfiguredBrick } from "@/pageEditor/exampleBrickConfigs";
import { sidebarPanelFormStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { render } from "@/pageEditor/testHelpers";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { screen } from "@testing-library/react";
import React from "react";
import { CustomFormRenderer } from "@/bricks/renderers/customForm";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { waitForEffect } from "@/testUtils/testHelpers";
import userEvent from "@testing-library/user-event";
import FormRendererOptions from "@/pageEditor/fields/FormRendererOptions";

beforeAll(() => {
  registerDefaultWidgets();
});

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
          dispatch(editorActions.addElement(initialValues));
          dispatch(editorActions.selectElement(initialValues.uuid));
          dispatch(editorActions.setElementActiveNodeId(brick.instanceId));
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
          dispatch(editorActions.addElement(initialValues));
          dispatch(editorActions.selectElement(initialValues.uuid));
          dispatch(editorActions.setElementActiveNodeId(brick.instanceId));
        },
      },
    );

    await waitForEffect();

    const element = screen.getByText("Custom Submit Handler");

    // TODO: fix a11y of bootstrap-switch-button-react so we can target in tests
    // eslint-disable-next-line testing-library/no-node-access -- use of bootstrap-switch-button-react is not accessible
    const fieldGroup = element.nextSibling as HTMLElement;
    // eslint-disable-next-line testing-library/no-node-access -- use of bootstrap-switch-button-react is not accessible
    await userEvent.click(fieldGroup.querySelector(".switch"));

    // Field defaults to save data
    expect(screen.getByText(/save data/i)).toBeInTheDocument();
  });
});
