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
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import runtimeSlice from "@/pageEditor/slices/runtimeSlice";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import FoundationDataPanel from "@/pageEditor/tabs/editTab/dataPanel/FoundationDataPanel";
import { formStateWithTraceDataFactory } from "@/testUtils/factories/pageEditorFactories";

describe("FoundationDataPanel", () => {
  test("it renders with form state and trace data", async () => {
    const { formState, records } = formStateWithTraceDataFactory();
    const modComponentId = formState.uuid;
    const { instanceId } = formState.modComponent.brickPipeline[0];
    const { asFragment } = render(<FoundationDataPanel />, {
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
        dispatch(
          editorActions.setNodeDataPanelTabSelected(DataPanelTabKey.Output),
        );
      },
    });
    await waitForEffect();

    expect(asFragment()).toMatchSnapshot();
  });
});
