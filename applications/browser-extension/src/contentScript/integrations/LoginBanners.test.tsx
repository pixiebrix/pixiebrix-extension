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
import LoginBanners from "./LoginBanners";
import { sanitizedIntegrationConfigFactory } from "../../testUtils/factories/integrationFactories";
import userEvent from "@testing-library/user-event";

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
    render(<LoginBanners deferredLogins={[]} dismissLogin={jest.fn()} />);
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
        dismissLogin={jest.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Log in to My Config" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /close alert/i,
      }),
    ).toBeInTheDocument();
  });

  test("clicking the close alert button calls dismissLogin", async () => {
    const dismissLogin = jest.fn();
    const config = sanitizedIntegrationConfigFactory({ label: "My Config" });
    render(
      <LoginBanners
        deferredLogins={[
          {
            integration: { name: "test" },
            config,
          },
        ]}
        dismissLogin={dismissLogin}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /close alert/i }));

    expect(dismissLogin).toHaveBeenCalledWith(config.id);
  });
});
