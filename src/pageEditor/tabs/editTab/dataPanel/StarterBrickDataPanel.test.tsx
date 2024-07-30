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
import { waitForEffect } from "@/testUtils/testHelpers";
import { render } from "@/pageEditor/testHelpers";
import { screen } from "@testing-library/react";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import runtimeSlice from "@/pageEditor/store/runtime/runtimeSlice";
import StarterBrickDataPanel from "@/pageEditor/tabs/editTab/dataPanel/StarterBrickDataPanel";
import { formStateWithTraceDataFactory } from "@/testUtils/factories/pageEditorFactories";

describe("StarterBrickDataPanel", () => {
  it("renders with form state and trace data", async () => {
    const { formState, records } = formStateWithTraceDataFactory();
    const modComponentId = formState.uuid;
    const { instanceId } = formState.modComponent.brickPipeline[0];
    const { asFragment } = render(<StarterBrickDataPanel />, {
      initialValues: formState,
      setupRedux(dispatch) {
        dispatch(editorActions.addModComponentFormState(formState));
        dispatch(editorActions.setActiveModComponentId(formState.uuid));
        dispatch(
          runtimeSlice.actions.setModComponentTrace({
            modComponentId,
            records,
          }),
        );
        dispatch(editorActions.setActiveNodeId(instanceId));
      },
    });
    await waitForEffect();

    // Stater Brick should default to showing the output tab
    expect(screen.getByLabelText("Latest Run")).toBeInTheDocument();

    expect(asFragment()).toMatchSnapshot();
  });
});
