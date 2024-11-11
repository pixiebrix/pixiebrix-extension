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
import { render } from "@/pageEditor/testHelpers";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { actions as modComponentsActions } from "@/store/modComponents/modComponentSlice";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { AlertEffect } from "@/bricks/effects/alert";
import brickRegistry from "@/bricks/registry";
import { brickConfigFactory } from "@/testUtils/factories/brickFactories";
import { userEvent } from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import BrickDataPanel from "@/pageEditor/tabs/editTab/dataPanel/BrickDataPanel";
import useFlags from "@/hooks/useFlags";
import { FeatureFlags } from "@/auth/featureFlags";
import { modInstanceFactory } from "@/testUtils/factories/modInstanceFactories";
import { modDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { mapModInstanceToActivatedModComponents } from "@/store/modComponents/modInstanceUtils";

Element.prototype.scrollIntoView = jest.fn();
jest.mock("@/hooks/useFlags");

const alertBrick = new AlertEffect();

jest.mocked(useFlags).mockImplementation(() => ({
  ...jest.requireActual("@/hooks/useFlags"),
  flagOn: (flag: string) => flag === FeatureFlags.PAGE_EDITOR_FIND,
}));

beforeAll(() => {
  brickRegistry.register([alertBrick]);
});

describe("FindTab", () => {
  it("finds brick name or literal value", async () => {
    const message = "Hello, world!";

    const brickConfig = brickConfigFactory({
      id: alertBrick.id,
      config: { message },
    });
    const formState = formStateFactory({
      brickPipeline: [brickConfig],
    });

    render(<BrickDataPanel />, {
      setupRedux(dispatch) {
        dispatch(editorActions.addModComponentFormState(formState));
        dispatch(editorActions.setActiveNodeId(brickConfig.instanceId!));
        dispatch(
          editorActions.setNodeDataPanelTabSelected(DataPanelTabKey.Find),
        );
      },
    });

    // Search value
    await userEvent.type(screen.getByRole("searchbox"), "Hello");
    // Get by label text because the highlights split the text
    expect(screen.getByLabelText(message)).toBeInTheDocument();
    expect(screen.queryByLabelText(alertBrick.name)).not.toBeInTheDocument();

    // Search beginning of the brick name
    await userEvent.clear(screen.getByRole("searchbox"));
    await userEvent.type(
      screen.getByRole("searchbox"),
      alertBrick.name.slice(0, 1),
    );
    expect(screen.getByLabelText(alertBrick.name)).toBeInTheDocument();
    expect(screen.getByLabelText(message)).toBeInTheDocument();
    // Expect brick name match should be preferred (appear first)
    expect(
      screen
        .getByLabelText(alertBrick.name)
        .compareDocumentPosition(screen.getByLabelText(message)),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    // Search brick name
    await userEvent.clear(screen.getByRole("searchbox"));
    await userEvent.type(screen.getByRole("searchbox"), alertBrick.name);
    expect(screen.getByLabelText(alertBrick.name)).toBeInTheDocument();
    expect(screen.queryByLabelText(message)).not.toBeInTheDocument();
  });

  it("searches activated mod component", async () => {
    const message = "Hello, world!";

    const brickConfig = brickConfigFactory({
      id: alertBrick.id,
      config: { message },
    });

    const formState = formStateFactory({
      brickPipeline: [brickConfig],
    });

    const modInstance = modInstanceFactory({
      definition: modDefinitionFactory({
        metadata: formState.modMetadata,
      }),
    });

    const buttonCaption = "Activated Mod Caption";
    modInstance.definition.extensionPoints[0]!.config.caption = buttonCaption;

    render(<BrickDataPanel />, {
      setupRedux(dispatch) {
        dispatch(
          modComponentsActions.UNSAFE_setModComponents(
            mapModInstanceToActivatedModComponents(modInstance),
          ),
        );
        // Search from the other draft mod component
        dispatch(editorActions.addModComponentFormState(formState));
        dispatch(editorActions.setActiveNodeId(brickConfig.instanceId!));
        dispatch(
          editorActions.setNodeDataPanelTabSelected(DataPanelTabKey.Find),
        );
      },
    });

    // Search value
    await userEvent.type(screen.getByRole("searchbox"), buttonCaption);
    expect(screen.getByLabelText(buttonCaption)).toBeInTheDocument();
  });
});
