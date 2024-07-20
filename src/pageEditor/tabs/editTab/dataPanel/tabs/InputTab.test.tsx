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

import { render } from "@/pageEditor/testHelpers";
import InputTab from "@/pageEditor/tabs/editTab/dataPanel/tabs/InputTab";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import runtimeSlice from "@/pageEditor/store/runtime/runtimeSlice";
import { formStateWithTraceDataFactory } from "@/testUtils/factories/pageEditorFactories";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { Tab } from "react-bootstrap";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { type TraceRecord } from "@/telemetry/trace";
import { serializeError } from "serialize-error";

function renderInputDataTab(
  formState: ModComponentFormState,
  records: TraceRecord[],
) {
  const modComponentId = formState.uuid;

  return render(
    <Tab.Container activeKey={DataPanelTabKey.Input}>
      <InputTab />
    </Tab.Container>,
    {
      initialValues: formState,
      setupRedux(dispatch) {
        dispatch(editorActions.addModComponentFormState(formState));
        dispatch(editorActions.setActiveModComponentId(modComponentId));
        dispatch(
          runtimeSlice.actions.setModComponentTrace({
            modComponentId,
            records,
          }),
        );
        dispatch(
          editorActions.setActiveNodeId(
            formState.modComponent.brickPipeline[1].instanceId,
          ),
        );
      },
    },
  );
}

describe("InputDataTab", () => {
  it("change view mode", async () => {
    const { formState, records } = formStateWithTraceDataFactory();

    renderInputDataTab(formState, records);
    await userEvent.click(screen.getByLabelText("Variables"));

    expect(screen.getByText("@input")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Arguments"));

    expect(screen.queryByText("@input")).not.toBeInTheDocument();
  });

  it("handles input error", async () => {
    const { formState, records } = formStateWithTraceDataFactory();

    records[0].renderError = serializeError(new Error("Test Error"));

    renderInputDataTab(formState, records);

    expect(
      screen.getByText("Error evaluating brick arguments"),
    ).toBeInTheDocument();
    expect(screen.getByText("Test Error")).toBeInTheDocument();
  });
});
