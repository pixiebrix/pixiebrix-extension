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

import { renderHook } from "@/pageEditor/testHelpers";
import { useOptionsResolver } from "@/components/form/widgets/useOptionsResolver";
import { sanitizedIntegrationConfigFactory } from "@/testUtils/factories/integrationFactories";
import { waitFor } from "@testing-library/react";

const OPTIONS = [
  { value: 1, label: "Option One" },
  { value: 2, label: "Option Two" },
];

describe("useOptionsResolver", () => {
  it("returns the promise result directly if optionsFactory is a promise", async () => {
    const promise = Promise.resolve(OPTIONS);

    const { result } = renderHook(() => useOptionsResolver(null, promise));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    const { isSuccess, data } = result.current;
    expect(isSuccess).toBe(true);
    expect(data).toEqual(OPTIONS);
  });

  it("throws error if optionsFactory is a factory but config is null", async () => {
    const optionsFactory = async () => OPTIONS;
    const { result } = renderHook(() =>
      useOptionsResolver(null, optionsFactory),
    );

    await waitFor(() => {
      expect(result.current.error).toEqual(
        new Error("No integration configured"),
      );
    });
  });

  it("fetches options with config if optionsFactory is a factory and config is provided", async () => {
    const optionsFactory = jest.fn().mockResolvedValue(OPTIONS);
    const config = sanitizedIntegrationConfigFactory();

    const { result } = renderHook(() =>
      useOptionsResolver(config, optionsFactory),
    );

    expect(optionsFactory).toHaveBeenCalledWith(config, undefined);

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    const { isSuccess, data } = result.current;
    expect(isSuccess).toBe(true);
    expect(data).toEqual(OPTIONS);
  });
});
