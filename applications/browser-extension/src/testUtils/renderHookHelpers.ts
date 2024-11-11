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

import { waitFor } from "@testing-library/react";

import type { RenderHookResult } from "@testing-library/react-hooks";

/**
 * @file Helper methods for tests that use renderHook
 *
 * https://github.com/testing-library/react-hooks-testing-library/blob/chore/migration-guide/MIGRATION_GUIDE.md
 */

/**
 * Returns a Promise that resolves if the value returned from the provided selector changes.
 * It is expected that the result of renderHook will be used to select the value for comparison.
 *
 * In most cases, prefer calling waitFor directly.
 *
 * NOTE: Calls will generate "It looks like you're using the wrong act()" warning until we upgrade to React 18 and
 * the corresponding testing library versions, but they're benign
 *
 * - https://github.com/testing-library/react-hooks-testing-library/blob/chore/migration-guide/MIGRATION_GUIDE.md#waitforvaluetochange
 * - https://react-hooks-testing-library.com/reference/api#waitforvaluetochange
 *
 * @see waitFor
 */
export async function waitForValueToChange<T>(getValue: () => T | Promise<T>) {
  const original = getValue();

  await waitFor(async () => {
    // eslint-disable-next-line jest/prefer-expect-resolves -- .resolves syntax requires promise
    expect(await original).not.toBe(await getValue());
  });
}

/**
 * Returns a promise that waits for the value of result.current to change. Only use this method in the rare case
 * you're testing intermediary hook results (e.g., that there's no flickering). Otherwise, use waitFor directly.
 *
 * NOTE: Calls will generate "It looks like you're using the wrong act()" warning until we upgrade to React 18 and
 * the corresponding testing library versions, but they're benign
 *
 * Note that this is not quite the implementation from @testing-library/react-hooks, which simply waited for the next
 * render regardless of whether the value of result.current has changed or not, but this is more in line with how the
 * utility was intended to be used. Writing tests that rely on specific timing or numbers of renders is discouraged
 * in the Testing Library methodology as it focuses too much on implementation details of the hooks.
 *
 * @see waitFor
 */
export async function waitForNextUpdate(
  result: Pick<RenderHookResult<unknown, unknown>["result"], "current">,
) {
  const initialValue = result.current;
  await waitFor(() => {
    expect(result.current).not.toBe(initialValue);
  });
}
