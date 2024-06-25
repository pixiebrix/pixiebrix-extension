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
import { render, screen } from "@/pageEditor/testHelpers";
import DataPanel from "@/pageEditor/tabs/editTab/dataPanel/DataPanel";
import runtimeSlice from "@/pageEditor/slices/runtimeSlice";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import bricksRegistry from "@/bricks/registry";
import { echoBrick } from "@/runtime/pipelineTests/pipelineTestHelpers";
import { formStateWithTraceDataFactory } from "@/testUtils/factories/pageEditorFactories";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";

// Need at least one item so callers see the registry as initialized
bricksRegistry.register([echoBrick]);

const { formState, records } = formStateWithTraceDataFactory();
const renderDataPanel = () => {
  const extensionId = formState.uuid;
  const { instanceId } = formState.extension.blockPipeline[1];

  return render(<DataPanel />, {
    initialValues: formState,
    setupRedux(dispatch) {
      dispatch(editorActions.addModComponentFormState(formState));
      dispatch(editorActions.setActiveModComponentId(formState.uuid));
      dispatch(
        runtimeSlice.actions.setExtensionTrace({ extensionId, records }),
      );
      dispatch(editorActions.setElementActiveNodeId(instanceId));
      dispatch(
        editorActions.setNodeDataPanelTabSelected(DataPanelTabKey.Context),
      );
    },
  });
};

const reportEventMock = jest.mocked(reportEvent);

describe("DataPanel", () => {
  beforeEach(() => {
    reportEventMock.mockClear();
  });

  test("it renders with form state and trace data", async () => {
    const { asFragment } = renderDataPanel();
    await waitForEffect();

    expect(asFragment()).toMatchSnapshot();
  });

  test("reportEvent is called only once per DataPanel tab select", async () => {
    renderDataPanel();
    await waitForEffect();

    expect(reportEventMock).toHaveBeenCalledOnce();
    expect(reportEventMock).toHaveBeenCalledWith(Events.DATA_PANEL_TAB_VIEW, {
      tabName: DataPanelTabKey.Context,
      brickId: formState.extension.blockPipeline[1].id,
      modId: undefined,
    });

    reportEventMock.mockClear();

    // Selecting the same tab should not trigger another event
    screen.getByRole("tab", { name: "Context" }).click();
    await waitForEffect();

    expect(reportEventMock).not.toHaveBeenCalled();

    // Selecting a different tab should trigger another event
    screen.getByRole("tab", { name: "Comments" }).click();
    await waitForEffect();

    expect(reportEventMock).toHaveBeenCalledOnce();
    expect(reportEventMock).toHaveBeenCalledWith(Events.DATA_PANEL_TAB_VIEW, {
      tabName: DataPanelTabKey.Comments,
      brickId: formState.extension.blockPipeline[1].id,
      modId: undefined,
    });
  });
});
