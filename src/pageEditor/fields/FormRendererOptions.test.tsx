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

    // FIXME: is something defaulting the onSubmit pipeline to be toggled to be an empty pipeline?
    expect(screen.queryByText(/save data/i)).not.toBeVisible();

    await toggleBootstrapSwitch("Custom Submit Handler");

    // Field defaults to save data
    expect(screen.getByText(/save data/i)).toBeVisible();

    await toggleBootstrapSwitch("Custom Submit Handler");

    expect(screen.queryByText(/save data/i)).not.toBeVisible();
  });
});
