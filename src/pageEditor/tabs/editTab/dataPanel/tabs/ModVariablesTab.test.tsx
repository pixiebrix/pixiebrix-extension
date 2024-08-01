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
import ModVariablesTab from "./ModVariablesTab";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { getPageState } from "@/contentScript/messenger/api";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { Tab } from "react-bootstrap";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { getStandaloneModComponentRuntimeModId } from "@/utils/modUtils";

const getPageStateMock = jest.mocked(getPageState);

describe("ModVariablesTab", () => {
  beforeAll(() => {
    getPageStateMock.mockReset();
    getPageStateMock.mockResolvedValue({
      foo: "bar",
      baz: 32,
    });
  });

  async function renderPageStateTab(formState: ModComponentFormState) {
    const utils = render(
      <Tab.Container activeKey={DataPanelTabKey.ModVariables}>
        <ModVariablesTab />
      </Tab.Container>,
      {
        setupRedux(dispatch) {
          dispatch(actions.addModComponentFormState(formState));
          dispatch(actions.setActiveModComponentId(formState.uuid));
        },
      },
    );

    await waitForEffect();

    return utils;
  }

  it("renders with standalone mod component", async () => {
    const formState = formStateFactory();
    const { asFragment } = await renderPageStateTab(formState);
    expect(asFragment()).toMatchSnapshot();

    expect(getPageStateMock).toHaveBeenCalledWith(
      {
        frameId: 0,
        tabId: 0,
      },
      {
        namespace: expect.toBeString(),
        modComponentRef: {
          modComponentId: formState.uuid,
          modId: getStandaloneModComponentRuntimeModId(formState.uuid),
          starterBrickId: formState.starterBrick.metadata.id,
        },
      },
    );
  });

  it("renders with mod's mod component", async () => {
    const modMetadata = modMetadataFactory();

    const formState = formStateFactory({
      formStateConfig: {
        modMetadata,
      },
    });
    const { asFragment } = await renderPageStateTab(formState);
    expect(asFragment()).toMatchSnapshot();

    expect(getPageStateMock).toHaveBeenCalledWith(
      {
        frameId: 0,
        tabId: 0,
      },
      {
        namespace: expect.toBeString(),
        modComponentRef: {
          modComponentId: formState.uuid,
          modId: modMetadata.id,
          starterBrickId: formState.starterBrick.metadata.id,
        },
      },
    );
  });
});
