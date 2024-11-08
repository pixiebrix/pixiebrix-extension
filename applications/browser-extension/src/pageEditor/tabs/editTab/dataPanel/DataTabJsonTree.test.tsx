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
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { DataPanelTabKey } from "./dataPanelTypes";
import DataTabJsonTree from "./DataTabJsonTree";
import userEvent from "@testing-library/user-event";
import { cleanup, perf } from "@/vendors/reactPerformanceTesting/perf";
import { type RenderCountField } from "@/vendors/reactPerformanceTesting/perfTypes";
import { act, screen } from "@testing-library/react";
import { render } from "@/pageEditor/testHelpers";
import * as sinonTimers from "@sinonjs/fake-timers";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";

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

const renderJsonTree = () =>
  render(<DataTabJsonTree data={data} tabKey={DataPanelTabKey.Input} />, {
    setupRedux(dispatch) {
      dispatch(actions.addModComponentFormState(formStateFactory()));
    },
  });

let clock: sinonTimers.InstalledClock;
async function flushAsyncEffects() {
  return act(async () => {
    await clock.runAllAsync();
  });
}

beforeAll(() => {
  clock = sinonTimers.install();
});
afterAll(() => {
  clock.uninstall();
});

beforeEach(() => {
  clock.reset();
});
afterEach(() => {
  cleanup();
});

test("renders the DataTabJsonTree component", async () => {
  const { asFragment } = renderJsonTree();
  await flushAsyncEffects();
  expect(asFragment()).toMatchSnapshot();
});

test("doesn't re-render internal JSONTree on expand", async () => {
  // No delay to run the click without setTimeout. Otherwise, the test timeouts
  // See: https://onestepcode.com/testing-library-user-event-with-fake-timers/?utm_source=rss&utm_medium=rss&utm_campaign=testing-library-user-event-with-fake-timers
  const immediateUserEvent = userEvent.setup({ delay: null });
  const { renderCount } = perf(React);
  renderJsonTree();

  await flushAsyncEffects();

  // Renders the component 2x due to StrictMode
  expect(renderCount.current.JSONTree as RenderCountField[]).toStrictEqual([
    { value: 1 },
    { value: 1 },
  ]);

  // Get the element to expand the tree
  const bullet = screen.getByText("▶");

  await immediateUserEvent.click(bullet);

  // The click event doesn't trigger a re-render
  expect(renderCount.current.JSONTree as RenderCountField[]).toStrictEqual([
    { value: 1 },
    { value: 1 },
  ]);

  // The redux action to update the expanded state is async, resolving all timeouts for it to fire
  await flushAsyncEffects();

  // The expanded state in Redux has been updated, triggering a re-render of the DataTabJsonTree and hence the JSONTree
  // Vendored react-performance-testing library not supported in React 18 (exact limitations unclear):
  // https://github.com/keiya01/react-performance-testing/issues/27
  expect(
    renderCount.current.DataTabJsonTree as RenderCountField[],
  ).toStrictEqual([
    { value: 1 },
    // XXX: why is this count 3x instead of 2x? Which StrictMode behavior causes the 2x when expanding the node?
    // https://react.dev/reference/react/StrictMode#fixing-bugs-found-by-double-rendering-in-development
    { value: 3 },
  ]);

  // DataTabJsonTree and JSONTree should have rendered the same number of times
  expect(renderCount.current.JSONTree as RenderCountField[]).toStrictEqual([
    { value: 1 },
    { value: 3 },
  ]);
});
