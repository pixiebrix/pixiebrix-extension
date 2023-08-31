import React from "react";
import { render } from "@/pageEditor/testHelpers";
import TriggerConfiguration from "@/pageEditor/tabs/trigger/TriggerConfiguration";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { triggerFormStateFactory } from "@/testUtils/factories/pageEditorFactories";
import registerBuiltinBlocks from "@/bricks/registerBuiltinBlocks";
import { act, screen } from "@testing-library/react";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { waitForEffect } from "@/testUtils/testHelpers";
import userEvent from "@testing-library/user-event";
import CustomEventEffect from "@/bricks/effects/customEvent";

beforeAll(() => {
  registerBuiltinBlocks();
  registerDefaultWidgets();
});

describe("TriggerConfiguration", () => {
  it("renders custom event field with known event names", async () => {
    const formState = triggerFormStateFactory({}, [
      { id: CustomEventEffect.BRICK_ID, config: { eventName: "otherevent" } },
    ]);
    formState.extensionPoint.definition.trigger = "custom";
    formState.extensionPoint.definition.customEvent = { eventName: null };

    const { asFragment } = render(<TriggerConfiguration isLocked={false} />, {
      initialValues: formState,
      setupRedux(dispatch) {
        dispatch(editorActions.addElement(formState));
        dispatch(editorActions.selectElement(formState.uuid));
        dispatch(editorActions.setElementActiveNodeId(null));
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
