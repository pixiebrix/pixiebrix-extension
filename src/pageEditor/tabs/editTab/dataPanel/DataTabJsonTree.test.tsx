/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import {
  actions,
  editorSlice,
  initialState,
} from "@/pageEditor/slices/editorSlice";
import { formStateFactory } from "@/testUtils/factories";
import { createRenderFunction, waitForEffect } from "@/testUtils/testHelpers";
import { DataPanelTabKey } from "./dataPanelTypes";
import DataTabJsonTree from "./DataTabJsonTree";
import userEvent from "@testing-library/user-event";
import { cleanup, perf } from "@/testUtils/performanceTesting/perf";
import { RenderCountField } from "@/testUtils/performanceTesting/perfTypes";
import { act } from "@testing-library/react";

jest.unmock("react-redux");

const data = {
  name: "test",
  foo: [
    {
      bar: "baz",
    },
    {
      qux: "quux",
    },
  ],
};

// Need to add and select an element before we can work with Data Panel tabs
const editorPreloadedState = editorSlice.reducer(
  initialState,
  actions.selectInstalled(formStateFactory())
);
const renderJsonTree = createRenderFunction({
  reducer: {
    editor: editorSlice.reducer,
  },
  preloadedState: {
    editor: editorPreloadedState,
  },
  ComponentUnderTest: DataTabJsonTree,
  defaultProps: { data, tabKey: DataPanelTabKey.Context },
});

afterEach(() => {
  cleanup();
});

test("renders the DataTabJsonTree component", () => {
  const rendered = renderJsonTree();
  expect(rendered.asFragment()).toMatchSnapshot();
});

test("doesn't re-render internal JSONTree on expand", async () => {
  jest.useFakeTimers();
  const { renderCount } = perf(React);
  const rendered = renderJsonTree();

  // Get the element to expand the tree
  const bullet = rendered.container.querySelector("li > div > div");

  await userEvent.click(bullet, {
    // No delay to run the click without setTimeout. Otherwise the test timeouts
    // See: https://onestepcode.com/testing-library-user-event-with-fake-timers/?utm_source=rss&utm_medium=rss&utm_campaign=testing-library-user-event-with-fake-timers
    delay: null,
  });

  act(() => {
    // The redux action to update the expanded state is async, resolving all timeouts for it to fire
    jest.runAllTimers();
  });

  // Ensure the JSONTree was rendered only once
  expect((renderCount.current.JSONTree as RenderCountField).value).toBe(1);
  jest.useRealTimers();
});
