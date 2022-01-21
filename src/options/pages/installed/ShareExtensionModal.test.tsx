/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import ShareExtensionModal from "./ShareExtensionModal";
import { extensionFactory } from "@/tests/factories";
import { waitForEffect } from "@/tests/testHelpers";
import userEvent from "@testing-library/user-event";
import { Organization } from "@/types/contract";

jest.mock("@/hooks/useNotifications");
jest.mock("@/services/api", () => ({
  useGetOrganizationsQuery: () => ({ data: [] as Organization[] }),
}));

test("renders modal", async () => {
  render(
    <ShareExtensionModal
      extension={extensionFactory({
        label: "testExtension",
      })}
    />
  );
  await waitForEffect();
  const dialogRoot = screen.getByRole("dialog");
  expect(dialogRoot).toMatchSnapshot();
});

test("prints 'Convert' when not Public (default)", async () => {
  render(
    <ShareExtensionModal
      extension={extensionFactory({
        label: "testExtension",
      })}
    />
  );
  await waitForEffect();
  const dialogRoot = screen.getByRole("dialog");
  const publicSwitch = dialogRoot.querySelector(
    ".form-group:nth-child(5) .switch.btn"
  );
  expect(publicSwitch).toHaveClass("off");
  const submitButton = dialogRoot.querySelector('.btn[type="submit"]');
  expect(submitButton.textContent).toBe("Convert");
});
test("prints 'Share' when Public", async () => {
  render(
    <ShareExtensionModal
      extension={extensionFactory({
        label: "testExtension",
      })}
    />
  );
  await waitForEffect();
  const dialogRoot = screen.getByRole("dialog");
  const publicSwitch = dialogRoot.querySelector(
    ".form-group:nth-child(5) .switch.btn"
  );
  userEvent.click(publicSwitch);
  expect(publicSwitch).toHaveClass("on");
  const submitButton = dialogRoot.querySelector('.btn[type="submit"]');
  expect(submitButton.textContent).toBe("Share");
});
