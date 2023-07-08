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
import { actions } from "@/pageEditor/slices/editorSlice";
import { DataPanelTabKey } from "./dataPanelTypes";
import DataTabJsonTree from "./DataTabJsonTree";
import userEvent from "@testing-library/user-event";
import { cleanup, perf } from "@/vendors/reactPerformanceTesting/perf";
import { type RenderCountField } from "@/vendors/reactPerformanceTesting/perfTypes";
import { act } from "@testing-library/react";
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
  render(<DataTabJsonTree data={data} tabKey={DataPanelTabKey.Context} />, {
    setupRedux(dispatch) {
      dispatch(actions.selectInstalled(formStateFactory()));
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
  const rendered = renderJsonTree();
  await flushAsyncEffects();
  expect(rendered.asFragment()).toMatchSnapshot();
});

test("doesn't re-render internal JSONTree on expand", async () => {
  // No delay to run the click without setTimeout. Otherwise the test timeouts
  // See: https://onestepcode.com/testing-library-user-event-with-fake-timers/?utm_source=rss&utm_medium=rss&utm_campaign=testing-library-user-event-with-fake-timers
  const immediateUserEvent = userEvent.setup({ delay: null });
  const { renderCount } = perf(React);
  const rendered = renderJsonTree();

  await flushAsyncEffects();

  expect((renderCount.current.JSONTree as RenderCountField).value).toBe(1);

  // Get the element to expand the tree
  const bullet = rendered.container.querySelector("li > div > div");

  await immediateUserEvent.click(bullet);

  // The click event doesn't trigger a re-render
  expect((renderCount.current.JSONTree as RenderCountField).value).toBe(1);

  // The redux action to update the expanded state is async, resolving all timeouts for it to fire
  await flushAsyncEffects();

  // The expanded state in Redux has been updated, this triggers a re-render of the DataTabJsonTree and hence the JSONTree
  expect((renderCount.current.JSONTree as RenderCountField).value).toBe(2);
});
