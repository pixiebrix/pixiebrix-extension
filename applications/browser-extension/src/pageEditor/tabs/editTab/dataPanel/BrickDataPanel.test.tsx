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
import { waitForEffect } from "../../../../testUtils/testHelpers";
import { render, screen } from "../../../testHelpers";
import BrickDataPanel from "./BrickDataPanel";
import runtimeSlice from "../../../store/runtime/runtimeSlice";
import { actions as editorActions } from "../../../store/editor/editorSlice";
import { DataPanelTabKey } from "./dataPanelTypes";
import bricksRegistry from "../../../../bricks/registry";
import { echoBrick } from "../../../../runtime/pipelineTests/testHelpers";
import { formStateWithTraceDataFactory } from "../../../../testUtils/factories/pageEditorFactories";
import reportEvent from "../../../../telemetry/reportEvent";
import { Events } from "../../../../telemetry/events";

// Need at least one item so callers see the registry as initialized
bricksRegistry.register([echoBrick]);

const { formState, records } = formStateWithTraceDataFactory();
const renderDataPanel = () => {
  const modComponentId = formState.uuid;
  const { instanceId } = formState.modComponent.brickPipeline[1]!;

  return render(<BrickDataPanel />, {
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
      dispatch(editorActions.setActiveNodeId(instanceId!));
      dispatch(
        editorActions.setNodeDataPanelTabSelected(DataPanelTabKey.Input),
      );
    },
  });
};

const reportEventMock = jest.mocked(reportEvent);

describe("BrickDataPanel", () => {
  beforeEach(() => {
    reportEventMock.mockClear();
  });

  it("renders with form state and trace data", async () => {
    const { asFragment } = renderDataPanel();
    await waitForEffect();

    expect(asFragment()).toMatchSnapshot();
  });

  test("reportEvent is called only once per DataPanel tab select", async () => {
    renderDataPanel();
    await waitForEffect();

    expect(reportEventMock).toHaveBeenCalledOnce();
    expect(reportEventMock).toHaveBeenCalledWith(Events.DATA_PANEL_TAB_VIEW, {
      tabName: DataPanelTabKey.Input,
      brickId: formState.modComponent.brickPipeline[1]!.id,
      modId: expect.toBeString(),
    });

    reportEventMock.mockClear();

    // Selecting the same tab should not trigger another event
    screen.getByRole("tab", { name: "Input" }).click();
    await waitForEffect();

    expect(reportEventMock).not.toHaveBeenCalled();

    // Selecting a different tab should trigger another event
    screen.getByRole("tab", { name: "Comments" }).click();
    await waitForEffect();

    expect(reportEventMock).toHaveBeenCalledOnce();
    expect(reportEventMock).toHaveBeenCalledWith(Events.DATA_PANEL_TAB_VIEW, {
      tabName: DataPanelTabKey.Comments,
      brickId: formState.modComponent.brickPipeline[1]!.id,
      modId: expect.toBeString(),
    });
  });
});
