/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import React, { type MutableRefObject } from "react";
import VarMenu from "@/components/fields/schemaFields/widgets/varPopup/VarMenu";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { waitForEffect } from "@/testUtils/testHelpers";
import registerBuiltinBlocks from "@/blocks/registerBuiltinBlocks";
import analysisSlice from "@/analysis/analysisSlice";
import VarAnalysis from "@/analysis/analysisVisitors/varAnalysis/varAnalysis";

const TestWrapper: React.FunctionComponent<{
  renderMenu: (
    inputElementRef: MutableRefObject<HTMLInputElement>
  ) => React.ReactNode;
}> = ({ renderMenu }) => {
  const inputElementRef = React.useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={inputElementRef} />
      {renderMenu(inputElementRef)}
    </>
  );
};

beforeAll(() => {
  registerBuiltinBlocks();
});

describe("VarMenu", () => {
  test("shows variables not available message", async () => {
    const formState = formStateFactory();

    const wrapper = render(
      <TestWrapper
        renderMenu={(inputElementRef) => (
          <VarMenu
            inputElementRef={inputElementRef}
            onClose={jest.fn()}
            onVarSelect={jest.fn()}
            likelyVariable="@foo"
          />
        )}
      />,
      {
        setupRedux(dispatch) {
          dispatch(editorActions.addElement(formState));
          dispatch(editorActions.selectElement(formState.uuid));
        },
      }
    );

    await waitForEffect();

    expect(
      wrapper.getByText("Available variables have not been computed yet.")
    ).toBeInTheDocument();
  });

  test("shows view for unmatched top-level variable", async () => {
    const formState = formStateFactory();

    const wrapper = render(
      <TestWrapper
        renderMenu={(inputElementRef) => (
          <VarMenu
            inputElementRef={inputElementRef}
            onClose={jest.fn()}
            onVarSelect={jest.fn()}
            likelyVariable="@foo"
          />
        )}
      />,
      {
        async setupRedux(dispatch) {
          dispatch(editorActions.addElement(formState));
          dispatch(editorActions.selectElement(formState.uuid));
          dispatch(
            editorActions.setElementActiveNodeId(
              formState.extension.blockPipeline[0].instanceId
            )
          );

          // Run analysis directly
          const analysis = new VarAnalysis({ trace: [], modState: {} });
          await analysis.run(formState);

          dispatch(
            analysisSlice.actions.setKnownVars({
              extensionId: formState.uuid,
              vars: analysis.getKnownVars(),
            })
          );
        },
      }
    );

    await waitForEffect();

    // Can't include @foo in query because it's within a span
    expect(wrapper.queryByText("No variables found for")).toBeInTheDocument();
  });

  test("shows view for match", async () => {
    const formState = formStateFactory();

    const wrapper = render(
      <TestWrapper
        renderMenu={(inputElementRef) => (
          <VarMenu
            inputElementRef={inputElementRef}
            onClose={jest.fn()}
            onVarSelect={jest.fn()}
            likelyVariable="@inp"
          />
        )}
      />,
      {
        async setupRedux(dispatch) {
          dispatch(editorActions.addElement(formState));
          dispatch(editorActions.selectElement(formState.uuid));
          dispatch(
            editorActions.setElementActiveNodeId(
              formState.extension.blockPipeline[0].instanceId
            )
          );

          // Run analysis directly
          const analysis = new VarAnalysis({ trace: [], modState: {} });
          await analysis.run(formState);

          dispatch(
            analysisSlice.actions.setKnownVars({
              extensionId: formState.uuid,
              vars: analysis.getKnownVars(),
            })
          );
        },
      }
    );

    await waitForEffect();

    expect(
      wrapper.queryByText("No variables found for")
    ).not.toBeInTheDocument();

    // @inp matches @input
    expect(wrapper.queryByText("@input")).toBeInTheDocument();

    expect(wrapper.asFragment()).toMatchSnapshot();
  });
});
