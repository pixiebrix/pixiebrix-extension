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

import { render, screen } from "@/pageEditor/testHelpers";
import React, { type MutableRefObject } from "react";
import VarMenu from "@/components/fields/schemaFields/widgets/varPopup/VarMenu";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { waitForEffect } from "@/testUtils/testHelpers";
import registerBuiltinBricks from "@/bricks/registerBuiltinBricks";
import analysisSlice from "@/analysis/analysisSlice";
import VarAnalysis from "@/analysis/analysisVisitors/varAnalysis/varAnalysis";

const TestWrapper: React.FunctionComponent<{
  renderMenu: (
    inputElementRef: MutableRefObject<HTMLInputElement>,
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

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

beforeAll(() => {
  registerBuiltinBricks();
});

afterAll(() => {
  jest.clearAllMocks();
});

describe("VarMenu", () => {
  test("shows variables not available message", async () => {
    const formState = formStateFactory();

    render(
      <TestWrapper
        renderMenu={(inputElementRef) => (
          <VarMenu
            inputElementRef={inputElementRef}
            onClose={jest.fn()}
            onVarSelect={jest.fn()}
            likelyVariable="@foo"
            variablePosition={3}
          />
        )}
      />,
      {
        setupRedux(dispatch) {
          dispatch(editorActions.addModComponentFormState(formState));
          dispatch(editorActions.setActiveModComponentId(formState.uuid));
          dispatch(
            editorActions.setActiveNodeId(
              formState.modComponent.blockPipeline[0].instanceId,
            ),
          );
        },
      },
    );

    await waitForEffect();

    expect(
      screen.getByText("Available variables have not been computed yet."),
    ).toBeInTheDocument();
  });

  test("shows view for unmatched top-level variable", async () => {
    const formState = formStateFactory();

    render(
      <TestWrapper
        renderMenu={(inputElementRef) => (
          <VarMenu
            inputElementRef={inputElementRef}
            onClose={jest.fn()}
            onVarSelect={jest.fn()}
            likelyVariable="@foo"
            variablePosition={3}
          />
        )}
      />,
      {
        async setupRedux(dispatch) {
          dispatch(editorActions.addModComponentFormState(formState));
          dispatch(editorActions.setActiveModComponentId(formState.uuid));
          dispatch(
            editorActions.setActiveNodeId(
              formState.modComponent.blockPipeline[0].instanceId,
            ),
          );

          // Run analysis directly
          const analysis = new VarAnalysis();
          await analysis.run(formState);

          dispatch(
            analysisSlice.actions.setKnownVars({
              modComponentId: formState.uuid,
              vars: analysis.getKnownVars(),
            }),
          );
        },
      },
    );

    await waitForEffect();

    // Can't include @foo in query because it's within a span
    expect(screen.getByText("No variables found for")).toBeInTheDocument();
  });

  test("shows view for match", async () => {
    const formState = formStateFactory();

    const { asFragment } = render(
      <TestWrapper
        renderMenu={(inputElementRef) => (
          <VarMenu
            inputElementRef={inputElementRef}
            onClose={jest.fn()}
            onVarSelect={jest.fn()}
            likelyVariable="@inp"
            variablePosition={3}
          />
        )}
      />,
      {
        async setupRedux(dispatch) {
          dispatch(editorActions.addModComponentFormState(formState));
          dispatch(editorActions.setActiveModComponentId(formState.uuid));
          dispatch(
            editorActions.setActiveNodeId(
              formState.modComponent.blockPipeline[0].instanceId,
            ),
          );

          // Run analysis directly
          const analysis = new VarAnalysis();
          await analysis.run(formState);

          dispatch(
            analysisSlice.actions.setKnownVars({
              modComponentId: formState.uuid,
              vars: analysis.getKnownVars(),
            }),
          );
        },
      },
    );

    await waitForEffect();

    expect(
      screen.queryByText("No variables found for"),
    ).not.toBeInTheDocument();

    // @inp matches @input
    expect(screen.getByText("@input")).toBeInTheDocument();

    // eslint-disable-next-line @shopify/jest/no-snapshots -- verifies the menu is rendered as expected
    expect(asFragment()).toMatchSnapshot();
  });
});
