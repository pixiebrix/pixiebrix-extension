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
import { render, waitForEffect } from "@/testUtils/testHelpers";
import DataPanel from "@/pageEditor/tabs/editTab/dataPanel/DataPanel";
import {
  formStateFactory,
  foundationOutputFactory,
  traceRecordFactory,
} from "@/testUtils/factories";
import runtimeSlice from "@/pageEditor/slices/runtimeSlice";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import { JsonObject } from "type-fest";
import { OutputKey } from "@/core";

describe("DataPanel", () => {
  test("it renders with form state and trace", async () => {
    const formState = formStateFactory();
    const extensionId = formState.uuid;
    let outputKey = "" as OutputKey;
    let output: JsonObject = foundationOutputFactory();
    const records = formState.extension.blockPipeline.map((block, index) => {
      const context = output;
      outputKey = `output${index}` as OutputKey;
      output = {
        foo: `bar number ${index}`,
        baz: index * 3,
        qux: {
          thing1: [index * 7, index * 9, index * 11],
          thing2: false,
        },
      };

      return traceRecordFactory({
        extensionId,
        blockInstanceId: block.instanceId,
        blockId: block.id,
        templateContext: context,
        blockConfig: block,
        outputKey,
        output,
      });
    });
    const { instanceId } = formState.extension.blockPipeline[1];
    const rendered = render(<DataPanel instanceId={instanceId} />, {
      initialValues: formState,
      setupRedux(dispatch) {
        dispatch(editorActions.addElement(formState));
        dispatch(editorActions.selectElement(formState.uuid));
        dispatch(
          runtimeSlice.actions.setExtensionTrace({ extensionId, records })
        );
        dispatch(editorActions.setElementActiveNodeId(instanceId));
        dispatch(
          editorActions.setNodeDataPanelTabSelected(DataPanelTabKey.Context)
        );
      },
    });
    await waitForEffect();

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });
});
