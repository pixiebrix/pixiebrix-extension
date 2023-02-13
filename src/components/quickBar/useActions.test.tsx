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
import { act, renderHook } from "@testing-library/react-hooks";
import useActions from "@/components/quickBar/useActions";
import { KBarProvider, useKBar } from "kbar";
import defaultActions from "@/components/quickBar/defaultActions";
import quickBarRegistry from "@/components/quickBar/quickBarRegistry";

describe("useActions", () => {
  test("should return the default actions", () => {
    const hook = renderHook(
      () => {
        useActions();
        return useKBar(({ actions }) => ({ actions }));
      },
      {
        wrapper: ({ children }) => <KBarProvider>{children}</KBarProvider>,
      }
    );

    expect(Object.keys(hook.result.current.actions)).toHaveLength(
      defaultActions.length
    );
  });

  test("should add/remove action", async () => {
    const hook = renderHook(
      () => {
        useActions();
        return useKBar(({ actions }) => ({ actions }));
      },
      {
        wrapper: ({ children }) => <KBarProvider>{children}</KBarProvider>,
      }
    );

    await act(async () => {
      quickBarRegistry.addAction({
        id: "test",
        name: "Test Action",
      });
    });

    expect(Object.keys(hook.result.current.actions)).toHaveLength(
      defaultActions.length + 1
    );

    await act(async () => {
      quickBarRegistry.removeAction("test");
    });

    expect(Object.keys(hook.result.current.actions)).toHaveLength(
      defaultActions.length
    );
  });
});
