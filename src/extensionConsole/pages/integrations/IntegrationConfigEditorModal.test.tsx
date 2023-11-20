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
import { fromJS } from "@/integrations/LocalDefinedIntegration";
import IntegrationConfigEditorModal from "@/extensionConsole/pages/integrations/IntegrationConfigEditorModal";
import { render, screen } from "@/extensionConsole/testHelpers";
import { waitForEffect } from "@/testUtils/testHelpers";

// FIXME: this is coming through as a module with default being a JSON object. (yaml-jest-transform is being applied)
import pipedriveYaml from "@contrib/integrations/pipedrive.yaml?loadAsText";
import automationAnywhereYaml from "@contrib/integrations/automation-anywhere.yaml?loadAsText";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import userEvent from "@testing-library/user-event";
import { type IntegrationConfig } from "@/integrations/integrationTypes";
import { convertSchemaToConfigState } from "@/components/auth/AuthWidget";
import { within } from "@testing-library/react";

beforeAll(() => {
  registerDefaultWidgets();
});

describe("IntegrationConfigEditorModal", () => {
  test("Can render Pipedrive configuration modal without existing configuration", async () => {
    const service = fromJS(pipedriveYaml as any);

    render(
      <IntegrationConfigEditorModal
        initialValues={
          {
            label: "",
            integrationId: service.id,
            config: convertSchemaToConfigState(service.schema),
          } as IntegrationConfig
        }
        onDelete={jest.fn()}
        onSave={jest.fn()}
        onClose={jest.fn()}
        integration={service}
      />
    );

    await waitForEffect();

    expect(screen.getByDisplayValue("pipedrive/api")).not.toBeNull();
    expect(screen.getByText("Save")).not.toBeNull();
    expect(screen.getByText("Delete")).not.toBeNull();
    expect(screen.getByText("Close")).not.toBeNull();

    const dialogRoot = screen.getByRole("dialog");
    for (const property of Object.keys(service.schema.properties)) {
      expect(within(dialogRoot).getByLabelText(property)).toBeVisible();
    }
  });

  test("displays user-friendly pattern validation message", async () => {
    const service = fromJS(automationAnywhereYaml as any);
    const user = userEvent.setup();

    render(
      <IntegrationConfigEditorModal
        initialValues={{ label: "" } as IntegrationConfig}
        onDelete={jest.fn()}
        onSave={jest.fn()}
        onClose={jest.fn()}
        integration={service}
      />
    );

    await waitForEffect();

    await user.click(
      screen.getByRole("textbox", {
        name: "controlRoomUrl",
      })
    );
    await user.type(
      screen.getByRole("textbox", {
        name: "controlRoomUrl",
      }),
      "https://invalid.control.room/"
    );
    await user.click(screen.getByRole("textbox", { name: "username" }));

    expect(screen.getByText("Invalid controlRoomUrl format")).toBeVisible();
  });
});
