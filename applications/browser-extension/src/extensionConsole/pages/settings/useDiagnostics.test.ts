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

import { renderHook } from "@/extensionConsole/testHelpers";
import useDiagnostics from "@/extensionConsole/pages/settings/useDiagnostics";
import download from "downloadjs";
import { waitForEffect } from "@/testUtils/testHelpers";

jest.mock("downloadjs");

Object.defineProperty(navigator, "storage", {
  value: {
    estimate: jest.fn().mockResolvedValue({}),
  },
});

describe("useDiagnostics", () => {
  it("smoke test", async () => {
    const downloadMock = jest.mocked(download);

    const { result } = renderHook(() => useDiagnostics());

    await waitForEffect();

    await result.current.exportDiagnostics();
    expect(downloadMock).toHaveBeenCalledOnce();
  });
});
