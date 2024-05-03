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
import activateLinkClickHandler from "@/activation/activateLinkClickHandler";
import { render, screen } from "@testing-library/react";
import { registryIdFactory } from "@/testUtils/factories/stringFactories";
import userEvent from "@testing-library/user-event";
import { createActivationUrl } from "@/activation/activationLinkUtils";

const callback = jest.fn();

const handleClicks = (event: MouseEvent) => {
  activateLinkClickHandler(event, callback);
};

beforeEach(() => {
  jest.resetAllMocks();
});

describe("activateLinkClickHandler", () => {
  it("handles simple anchor element", async () => {
    const modId = registryIdFactory();
    const href = createActivationUrl([
      { modId, initialOptions: {} },
    ]).toString();
    render(<a href={href}>Activate Mod</a>);

    document.addEventListener("click", handleClicks);

    await userEvent.click(screen.getByRole("link", { name: "Activate Mod" }));

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "activateMods",
        mods: [{ modId, initialOptions: {} }],
        heading: expect.toBeString(),
      }),
    );
  });

  it.each(["id", "id[]"])(
    "handles multiple ids with param %s",
    async (paramName: string) => {
      const modIds = [registryIdFactory(), registryIdFactory()];

      // Not using constructActivationUrl because testing support for id and id[] params
      const url = new URL("https://app.pixiebrix.com/activate");
      url.searchParams.append(paramName, modIds[0]!);
      url.searchParams.append(paramName, modIds[1]!);

      render(<a href={url.href}>Activate Mod</a>);

      document.addEventListener("click", handleClicks);

      await userEvent.click(screen.getByRole("link", { name: "Activate Mod" }));

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "activateMods",
          mods: modIds.map((x) => ({ modId: x, initialOptions: {} })),
          heading: expect.toBeString(),
        }),
      );
    },
  );

  it("does not intercept non-activation links", async () => {
    render(<a href="https://example.com">Activate Mod</a>);

    document.addEventListener("click", handleClicks);

    await userEvent.click(screen.getByRole("link", { name: "Activate Mod" }));

    expect(callback).not.toHaveBeenCalled();
  });
});
