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

import React from "react";
import ModListItem from "./ModListItem";
import { screen } from "@testing-library/react";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { render } from "@/pageEditor/testHelpers";
import { Accordion, ListGroup } from "react-bootstrap";

describe("ModListItem", () => {
  test("it renders expanded", async () => {
    const modMetadata = modMetadataFactory();
    render(
      <Accordion defaultActiveKey={modMetadata.id}>
        <ListGroup>
          <ModListItem
            modMetadata={modMetadata}
            onSave={jest.fn()}
            isSaving={false}
            onReset={jest.fn()}
            onDeactivate={jest.fn()}
            onClone={jest.fn()}
          >
            <div>test children</div>
          </ModListItem>
        </ListGroup>
      </Accordion>,
    );

    expect(await screen.findByText(modMetadata.name)).toBeVisible();
    // eslint-disable-next-line testing-library/no-node-access -- Accordion collapse state
    expect(screen.getByText("test children").parentElement).toHaveClass(
      "collapse show",
    );
  });

  test("it renders not expanded", async () => {
    const modMetadata = modMetadataFactory();
    render(
      <Accordion defaultActiveKey={null}>
        <ListGroup>
          <ModListItem
            modMetadata={modMetadata}
            onSave={jest.fn()}
            isSaving={false}
            onReset={jest.fn()}
            onDeactivate={jest.fn()}
            onClone={jest.fn()}
          >
            <div>test children</div>
          </ModListItem>
        </ListGroup>
      </Accordion>,
    );

    expect(await screen.findByText(modMetadata.name)).toBeVisible();
    // eslint-disable-next-line testing-library/no-node-access -- Accordion collapse state
    expect(screen.getByText("test children").parentElement).toHaveClass(
      "collapse",
    );
    // eslint-disable-next-line testing-library/no-node-access -- Accordion collapse state
    expect(screen.getByText("test children").parentElement).not.toHaveClass(
      "show",
    );
  });

  // TODO: Add a test for the update warning indicator icon, after the feature is re-enabled
});
