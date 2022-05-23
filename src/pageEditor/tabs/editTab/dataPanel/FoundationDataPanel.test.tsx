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
import { formStateWithTraceDataFactory } from "@/testUtils/factories";
import { waitForEffect } from "@/testUtils/testHelpers";
import { render } from "@/pageEditor/testHelpers";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import runtimeSlice from "@/pageEditor/slices/runtimeSlice";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import FoundationDataPanel from "@/pageEditor/tabs/editTab/dataPanel/FoundationDataPanel";

describe("FoundationDataPanel", () => {
  test("it renders with form state and trace data", async () => {
    const { formState, records } = formStateWithTraceDataFactory();
    const extensionId = formState.uuid;
    const { instanceId } = formState.extension.blockPipeline[0];
    const rendered = render(
      <FoundationDataPanel firstBlockInstanceId={instanceId} />,
      {
        initialValues: formState,
        setupRedux(dispatch) {
          dispatch(editorActions.addElement(formState));
          dispatch(editorActions.selectElement(formState.uuid));
          dispatch(
            runtimeSlice.actions.setExtensionTrace({ extensionId, records })
          );
          dispatch(editorActions.setElementActiveNodeId(instanceId));
          dispatch(
            editorActions.setNodeDataPanelTabSelected(DataPanelTabKey.Output)
          );
        },
      }
    );
    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });
});
