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
import ModListItem from "./ModListItem";
import { screen } from "@testing-library/react";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { render } from "@/pageEditor/testHelpers";
import { Accordion, ListGroup } from "react-bootstrap";
import { appApiMock } from "@/testUtils/appApiMock";
import { modDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { normalizeSemVerString } from "@/types/helpers";
import { API_PATHS } from "@/data/service/urlPaths";

describe("ModListItem", () => {
  it("renders expanded", async () => {
    const modMetadata = modMetadataFactory();
    appApiMock.onGet(API_PATHS.MOD(modMetadata.id)).reply(
      200,
      modDefinitionFactory({
        metadata: modMetadata,
      }),
    );
    render(
      <Accordion defaultActiveKey={modMetadata.id}>
        <ListGroup>
          <ModListItem
            modMetadata={modMetadata}
            onSave={jest.fn()}
            onClearChanges={jest.fn()}
            onMakeCopy={jest.fn()}
          >
            <div>test children</div>
          </ModListItem>
        </ListGroup>
      </Accordion>,
    );

    await expect(screen.findByText(modMetadata.name)).resolves.toBeVisible();
    // eslint-disable-next-line testing-library/no-node-access -- Accordion collapse state
    expect(screen.getByText("test children").parentElement).toHaveClass(
      "collapse show",
    );
  });

  it("renders not expanded", async () => {
    const modMetadata = modMetadataFactory();
    appApiMock.onGet(API_PATHS.MOD(modMetadata.id)).reply(
      200,
      modDefinitionFactory({
        metadata: modMetadata,
      }),
    );
    render(
      <Accordion>
        <ListGroup>
          <ModListItem
            modMetadata={modMetadata}
            onSave={jest.fn()}
            onClearChanges={jest.fn()}
            onMakeCopy={jest.fn()}
          >
            <div>test children</div>
          </ModListItem>
        </ListGroup>
      </Accordion>,
    );

    await expect(screen.findByText(modMetadata.name)).resolves.toBeVisible();
    // eslint-disable-next-line testing-library/no-node-access -- Accordion collapse state
    expect(screen.getByText("test children").parentElement).toHaveClass(
      "collapse",
    );
    // eslint-disable-next-line testing-library/no-node-access -- Accordion collapse state
    expect(screen.getByText("test children").parentElement).not.toHaveClass(
      "show",
    );
  });

  it("renders has-update icon properly", async () => {
    const modMetadata = modMetadataFactory();
    const modDefinition = modDefinitionFactory({
      metadata: {
        ...modMetadata,
        version: normalizeSemVerString("1.0.1"),
      },
    });
    appApiMock.onGet(API_PATHS.MOD(modMetadata.id)).reply(200, {
      config: modDefinition,
      sharing: modDefinition.sharing,
      updated_at: modDefinition.updated_at,
    });
    render(
      <Accordion defaultActiveKey={modMetadata.id}>
        <ListGroup>
          <ModListItem
            modMetadata={modMetadata}
            onSave={jest.fn()}
            onClearChanges={jest.fn()}
            onMakeCopy={jest.fn()}
          >
            <div>test children</div>
          </ModListItem>
        </ListGroup>
      </Accordion>,
    );

    const expectedMessage =
      "You are editing version 1.0.0 of this mod, the latest version is 1.0.1.";

    await expect(
      screen.findByRole("img", { name: expectedMessage }),
    ).resolves.toBeVisible();
  });
});
