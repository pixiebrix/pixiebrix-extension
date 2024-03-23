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
import { render } from "@/extensionConsole/testHelpers";
import Sidebar from "@/extensionConsole/Sidebar";
import {
  mockAuthenticatedMeApiResponse,
  resetMeApiMocks,
} from "@/testUtils/userMock";
import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { waitForEffect } from "@/testUtils/testHelpers";

describe("Sidebar", () => {
  beforeEach(async () => {
    await resetMeApiMocks();
  });

  it("shows links for unrestricted users", async () => {
    await mockAuthenticatedMeApiResponse({
      flags: [],
    });

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    const pages = [
      "Mods",
      "Workshop",
      "Local Integrations",
      "Settings",
      "Marketplace",
      "Community Slack",
      "Documentation",
    ];

    for (const page of pages) {
      expect(screen.getByRole("link", { name: page })).toBeVisible();
    }
  });

  it("unrestricted partner user", async () => {
    await mockAuthenticatedMeApiResponse({
      flags: [],
      partner: {
        name: "automation-anywhere",
        theme: "automation-anywhere",
        documentation_url: "https://docs.automationanywhere.com/",
      },
    });

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    // Wait for the flags call to resolve
    await waitForEffect();

    const pages = [
      "Mods",
      "Workshop",
      "Local Integrations",
      "Settings",
      "Marketplace",
      "Documentation",
    ];

    for (const page of pages) {
      expect(screen.getByRole("link", { name: page })).toBeVisible();
    }

    const hidden = ["Community Slack"];

    for (const page of hidden) {
      expect(
        screen.queryByRole("link", { name: page }),
      ).not.toBeInTheDocument();
    }

    const documentationLink = screen.getByRole("link", {
      name: "Documentation",
    });
    expect(documentationLink).toHaveAttribute(
      "href",
      "https://docs.automationanywhere.com/",
    );
  });

  it("hides links for restricted users", async () => {
    await mockAuthenticatedMeApiResponse({
      // https://github.com/pixiebrix/pixiebrix-app/blob/395c5d3672689d0a7158e3d3ef11e821f69e669d/api/tests/users/test_me.py#L68-L79
      flags: [
        "enterprise-telemetry",
        "restricted-marketplace",
        "restricted-page-editor",
        "restricted-permissions",
        "restricted-reset",
        "restricted-service-url",
        "restricted-services",
        "restricted-uninstall",
        "restricted-workshop",
        "restricted-clear-token",
        "restricted-onboarding",
        "restricted-team",
      ],
    });

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    // Wait for the flags call to resolve
    await waitForEffect();

    const visible = ["Mods", "Settings", "Documentation"];

    for (const page of visible) {
      expect(screen.getByRole("link", { name: page })).toBeVisible();
    }

    const hidden = [
      "Workshop",
      "Local Integrations",
      "Marketplace",
      "Community Slack",
    ];

    for (const page of hidden) {
      expect(
        screen.queryByRole("link", { name: page }),
      ).not.toBeInTheDocument();
    }
  });
});
