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
import { perf, RenderCountField } from "react-performance-testing";
import "core-js";
import {
  actions,
  editorSlice,
  initialState,
} from "@/pageEditor/slices/editorSlice";
import { formStateFactory } from "@/testUtils/factories";
import { createRenderFunction } from "@/testUtils/testHelpers";
import { DataPanelTabKey } from "./dataPanelTypes";
import DataTabJsonTree from "./DataTabJsonTree";
import userEvent from "@testing-library/user-event";
import { act } from "react-dom/test-utils";

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

test("renders the DataTabJsonTree component", () => {
  const rendered = renderJsonTree();
  expect(rendered.asFragment()).toMatchSnapshot();
});

test("doesn't re-render internal JSONTree on expand", async () => {
  const { renderCount } = perf(React);
  const rendered = renderJsonTree();

  // Get the element to expand the tree
  const bullet = rendered.container.querySelector("li > div > div");

  await userEvent.click(bullet);

  // Ensure the JSONTree was rendered only once
  expect((renderCount.current.JSONTree as RenderCountField).value).toBe(1);
});
