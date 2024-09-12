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
import { modViewItemFactory } from "@/testUtils/factories/modViewItemFactory";
import { render, screen } from "@/extensionConsole/testHelpers";
import Status from "@/extensionConsole/pages/mods/Status";
import type { ModActionsEnabled, SharingSource } from "@/types/modTypes";
import useModPermissions from "@/mods/hooks/useModPermissions";
import userEvent from "@testing-library/user-event";

jest.mock("react-router", () => {
  const actual = jest.requireActual("react-router");
  return {
    ...actual,
    useHistory: jest.fn(),
  };
});

jest.mock("@/mods/hooks/useModPermissions", () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    hasPermissions: true,
    requestPermissions: jest.fn(),
  }),
}));

const requestPermissionsMock = jest.fn();

describe("Status", () => {
  beforeEach(() => {
    requestPermissionsMock.mockClear();
    jest.mocked(useModPermissions).mockReturnValue({
      hasPermissions: true,
      requestPermissions: requestPermissionsMock,
    });
  });

  it("handles unavailable mod", () => {
    const mod = modViewItemFactory({
      isUnavailable: true,
    });

    render(<Status modViewItem={mod} />);

    expect(screen.getByText("No longer available")).toBeInTheDocument();
  });

  it("handles inactive mod", () => {
    const mod = modViewItemFactory({
      modActions: {
        showReactivate: false,
        showActivate: true,
      } as unknown as ModActionsEnabled,
    });

    render(<Status modViewItem={mod} />);

    expect(screen.getByText("Activate")).toBeInTheDocument();
  });

  it("shows update properly", () => {
    const mod = modViewItemFactory({
      hasUpdate: true,
      modActions: {
        showReactivate: true,
        showActivate: false,
      } as unknown as ModActionsEnabled,
    });

    render(<Status modViewItem={mod} />);

    expect(screen.getByText("Update")).toBeInTheDocument();
  });

  it("doesn't show update for deployments", () => {
    const mod = modViewItemFactory({
      hasUpdate: true,
      modActions: {
        showReactivate: true,
        showActivate: false,
      } as unknown as ModActionsEnabled,
      sharingSource: {
        type: "Deployment",
      } as SharingSource,
    });

    render(<Status modViewItem={mod} />);

    expect(screen.queryByText("Update")).not.toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows allow properly", async () => {
    jest.mocked(useModPermissions).mockReturnValue({
      hasPermissions: false,
      requestPermissions: requestPermissionsMock,
    });

    const mod = modViewItemFactory({
      hasUpdate: false,
      modActions: {
        showReactivate: true,
        showActivate: false,
      } as unknown as ModActionsEnabled,
    });

    render(<Status modViewItem={mod} />);

    expect(screen.getByText("Allow")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Allow"));

    expect(requestPermissionsMock).toHaveBeenCalledTimes(1);
  });

  it("handles paused deployment", () => {
    const mod = modViewItemFactory({
      status: "Paused",
      modActions: {
        showReactivate: true,
        showActivate: false,
      } as unknown as ModActionsEnabled,
    });

    render(<Status modViewItem={mod} />);

    expect(screen.getByText("Paused")).toBeInTheDocument();
  });

  it("handles basic active mod", () => {
    const mod = modViewItemFactory({
      status: "Active",
      modActions: {
        showReactivate: true,
        showActivate: false,
      } as unknown as ModActionsEnabled,
    });

    render(<Status modViewItem={mod} />);

    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});
