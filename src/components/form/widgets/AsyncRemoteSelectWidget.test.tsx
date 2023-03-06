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

import { render } from "@testing-library/react";
import selectEvent from "react-select-event";
import React from "react";
import AsyncRemoteSelectWidget from "@/components/form/widgets/AsyncRemoteSelectWidget";
import { waitForEffect } from "@/testUtils/testHelpers";
import userEvent from "@testing-library/user-event";
import { sleep } from "@/utils";
import { act } from "react-dom/test-utils";

const id = "widget";
const name = "widget";

describe("AsyncRemoteSelectWidget", () => {
  test("does not fetch by default without defaultOptions", async () => {
    const onChangeMock = jest.fn();
    const optionsFactoryMock = jest.fn().mockResolvedValue([]);

    render(
      <AsyncRemoteSelectWidget
        id={id}
        name={name}
        optionsFactory={optionsFactoryMock}
        onChange={onChangeMock}
        defaultOptions
        value={null}
        config={null}
      />
    );

    await waitForEffect();

    expect(optionsFactoryMock).not.toHaveBeenCalled();
  });

  test("calls patched onChange", async () => {
    const onChangeMock = jest.fn();
    const optionsFactoryMock = jest
      .fn()
      .mockResolvedValue([{ value: "foo", label: "Foo" }]);

    const { container } = render(
      <AsyncRemoteSelectWidget
        id={id}
        name={name}
        optionsFactory={optionsFactoryMock}
        onChange={onChangeMock}
        defaultOptions
        value={null}
        config={null}
      />
    );

    await waitForEffect();

    await selectEvent.select(container.querySelector(`#${id}`), "Foo");

    expect(onChangeMock).toHaveBeenCalledWith({
      target: {
        value: "foo",
        name,
      },
    });
  });

  test("passed query to options factory", async () => {
    const onChangeMock = jest.fn();
    const optionsFactoryMock = jest.fn().mockResolvedValue([]);

    const { container } = render(
      <AsyncRemoteSelectWidget
        id={id}
        name={name}
        optionsFactory={optionsFactoryMock}
        onChange={onChangeMock}
        value={null}
        config={null}
      />
    );

    await waitForEffect();
    expect(optionsFactoryMock).not.toHaveBeenCalled();

    await act(async () => {
      await userEvent.click(container.querySelector('[role="combobox"]'));

      await userEvent.type(container.querySelector('[role="combobox"]'), "foo");

      // Wait for the debounce. :shrug: would be cleaner to advance timers here, but this will do for now
      await sleep(100);
      await waitForEffect();
    });

    expect(optionsFactoryMock).toHaveBeenCalledWith(null, { query: "foo" });
  });

  test("handles error state", async () => {
    const onChangeMock = jest.fn();
    const optionsFactoryMock = jest.fn().mockRejectedValue(new Error("Oh No!"));

    const { container, ...helpers } = render(
      <AsyncRemoteSelectWidget
        id={id}
        name={name}
        optionsFactory={optionsFactoryMock}
        onChange={onChangeMock}
        value={null}
        config={null}
      />
    );

    await waitForEffect();
    expect(optionsFactoryMock).not.toHaveBeenCalled();

    await act(async () => {
      await userEvent.click(container.querySelector('[role="combobox"]'));

      await userEvent.type(container.querySelector('[role="combobox"]'), "foo");

      // Wait for the debounce. :shrug: would be cleaner to advance timers here, but this will do for now
      await sleep(100);
      await waitForEffect();
    });

    expect(helpers.queryByDisplayValue("Oh No!")).toBeDefined();
  });
});
