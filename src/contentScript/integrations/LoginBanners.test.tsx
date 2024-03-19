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
import { render, screen } from "@testing-library/react";
import LoginBanners from "@/contentScript/integrations/LoginBanners";
import { sanitizedIntegrationConfigFactory } from "@/testUtils/factories/integrationFactories";

// I couldn't get shadow-dom-testing-library working
jest.mock("react-shadow/emotion", () => ({
  __esModule: true,
  default: {
    div(props: any) {
      return <div {...props}></div>;
    },
  },
}));

describe("LoginBanners", () => {
  test("smoke test no banners", () => {
    render(<LoginBanners deferredLogins={[]} />);
    expect(true).toBeTrue();
  });

  test("smoke test banner", () => {
    render(
      <LoginBanners
        deferredLogins={[
          {
            integration: { name: "test" },
            config: sanitizedIntegrationConfigFactory({ label: "My Config" }),
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Log in to My Config" }),
    ).toBeInTheDocument();
  });
});
