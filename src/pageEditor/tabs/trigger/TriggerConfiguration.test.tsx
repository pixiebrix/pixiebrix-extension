import React from "react";
import { render } from "@/pageEditor/testHelpers";
import TriggerConfiguration from "@/pageEditor/tabs/trigger/TriggerConfiguration";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { triggerFormStateFactory } from "@/testUtils/factories/pageEditorFactories";
import registerBuiltinBricks from "@/bricks/registerBuiltinBricks";
import { screen } from "@testing-library/react";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { waitForEffect } from "@/testUtils/testHelpers";
import userEvent from "@testing-library/user-event";
import CustomEventEffect from "@/bricks/effects/customEvent";
import { uuidv4 } from "@/types/helpers";

beforeAll(() => {
  registerBuiltinBricks();
  registerDefaultWidgets();
});

describe("TriggerConfiguration", () => {
  it("renders custom event field with known event names", async () => {
    const formState = triggerFormStateFactory({}, [
      {
        id: CustomEventEffect.BRICK_ID,
        config: { eventName: "otherevent" },
        instanceId: uuidv4(),
      },
    ]);
    formState.starterBrick.definition.trigger = "custom";
    formState.starterBrick.definition.customEvent = { eventName: null };

    const { asFragment } = render(<TriggerConfiguration isLocked={false} />, {
      initialValues: formState,
      setupRedux(dispatch) {
        dispatch(editorActions.addModComponentFormState(formState));
        dispatch(editorActions.setActiveModComponentId(formState.uuid));
        dispatch(editorActions.setActiveNodeId(null));
      },
    });

    await waitForEffect();

    expect(screen.getByLabelText("Custom Event")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Custom Event"));

    expect(screen.queryByText("No options")).not.toBeInTheDocument();
    expect(screen.getByText("otherevent")).toBeInTheDocument();

    expect(asFragment()).toMatchSnapshot();
  });
});
