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

import selectEvent from "react-select-event";
import React from "react";
import AsyncRemoteSelectWidget from "@/components/form/widgets/AsyncRemoteSelectWidget";
import { waitForEffect } from "@/testUtils/testHelpers";
import userEvent from "@testing-library/user-event";
import { act } from "react-dom/test-utils";
import { sleep } from "@/utils/timeUtils";
import { render, screen } from "@/pageEditor/testHelpers";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";

jest.mock("use-debounce", () => ({
  useDebouncedCallback: jest.fn((fn) => fn),
}));

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
        value={null}
      />,
      {
        initialValues: { [name]: null },
      },
    );

    await waitForEffect();

    expect(optionsFactoryMock).not.toHaveBeenCalled();
  });

  test("calls patched onChange", async () => {
    const onChangeMock = jest.fn();
    const optionsFactoryMock = jest
      .fn()
      .mockResolvedValue([{ value: "foo", label: "Foo" }]);

    render(
      <AsyncRemoteSelectWidget
        id={id}
        name={name}
        optionsFactory={optionsFactoryMock}
        onChange={onChangeMock}
        defaultOptions
        value={null}
      />,
      {
        initialValues: { [name]: null },
      },
    );

    await waitForEffect();

    await selectEvent.select(screen.getByRole("combobox"), "Foo");

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

    render(
      <AsyncRemoteSelectWidget
        id={id}
        name={name}
        optionsFactory={optionsFactoryMock}
        onChange={onChangeMock}
        value={null}
      />,
      {
        initialValues: { [name]: null },
      },
    );

    await waitForEffect();
    expect(optionsFactoryMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("combobox"));

    await userEvent.type(screen.getByRole("combobox"), "foo");

    // Wait for the debounce. :shrug: would be cleaner to advance timers here, but this will do for now
    await act(async () => {
      await sleep(1000);
    });
    await waitForEffect();

    expect(optionsFactoryMock).toHaveBeenCalledWith({
      query: "foo",
      value: null,
    });
  });

  it("passes the current value to the factory", async () => {
    const onChangeMock = jest.fn();
    const optionsFactoryMock = jest.fn().mockResolvedValue([]);

    render(
      <AsyncRemoteSelectWidget
        id={id}
        name={name}
        optionsFactory={optionsFactoryMock}
        onChange={onChangeMock}
        defaultOptions
        value="test-value"
      />,
      {
        initialValues: { [name]: null },
      },
    );

    await act(async () => {
      // Wait for the debounce. :shrug: would be cleaner to advance timers here, but this will do for now
      await sleep(1000);
      await waitForEffect();
    });

    expect(optionsFactoryMock).toHaveBeenCalledWith({
      query: "",
      value: "test-value",
    });
  });

  // These tests nest the widget in a ConnectedFieldTemplate in order to test the error field-annotation logic
  describe("error states with ConnectedFieldTemplate", () => {
    it("handles error state without defaultOptions", async () => {
      const optionsFactoryMock = jest
        .fn()
        .mockRejectedValue(new Error("Oh No!"));

      render(
        <ConnectedFieldTemplate
          name={name}
          label="Test Field"
          description="This is a test field for AsyncRemoteSelectWidget"
          as={AsyncRemoteSelectWidget}
          optionsFactory={optionsFactoryMock}
        />,
        {
          initialValues: { [name]: null },
        },
      );

      await waitForEffect();
      expect(optionsFactoryMock).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole("combobox"));

      await userEvent.type(screen.getByRole("combobox"), "foo");

      await expect(screen.findByText("Oh No!")).resolves.toBeInTheDocument();
    });

    it("handles error state with defaultOptions", async () => {
      const optionsFactoryMock = jest
        .fn()
        .mockRejectedValue(new Error("Oh No!"));

      render(
        <ConnectedFieldTemplate
          name={name}
          label="Test Field"
          description="This is a test field for AsyncRemoteSelectWidget"
          as={AsyncRemoteSelectWidget}
          optionsFactory={optionsFactoryMock}
          defaultOptions
        />,
        {
          initialValues: { [name]: null },
        },
      );

      await expect(screen.findByText("Oh No!")).resolves.toBeInTheDocument();
      expect(optionsFactoryMock).toHaveBeenCalled();
    });

    it("clears error state properly", async () => {
      const optionsFactoryMock = jest
        .fn()
        .mockRejectedValue(new Error("Oh No!"));

      const { rerender } = render(
        <ConnectedFieldTemplate
          name={name}
          label={"Test Field"}
          description="This is a test field for AsyncRemoteSelectWidget"
          as={AsyncRemoteSelectWidget}
          optionsFactory={optionsFactoryMock}
        />,
        {
          initialValues: { [name]: null },
        },
      );

      await waitForEffect();
      expect(optionsFactoryMock).not.toHaveBeenCalled();
      expect(screen.queryByText("Oh No!")).not.toBeInTheDocument();

      await userEvent.type(screen.getByRole("combobox"), "fo");

      await expect(screen.findByText("Oh No!")).resolves.toBeInTheDocument();

      const options = [
        {
          value: "foo",
          label: "Foo Option",
        },
        {
          value: "bar",
          label: "Bar Option",
        },
      ];

      optionsFactoryMock.mockImplementation(
        async ({ query }: { query: string }) =>
          options.filter((option) =>
            option.label.toLowerCase().includes(query.toLowerCase()),
          ),
      );

      // We need to force a re-mount of the component for the error to clear
      rerender(<div />);
      rerender(
        <ConnectedFieldTemplate
          name={name}
          label="Test Field"
          description="This is a test field for AsyncRemoteSelectWidget"
          as={AsyncRemoteSelectWidget}
          optionsFactory={optionsFactoryMock}
        />,
      );

      await waitForEffect();

      await userEvent.type(screen.getByRole("combobox"), "foo");

      expect(screen.queryByText("Oh No!")).not.toBeInTheDocument();
      expect(screen.getByText("Foo Option")).toBeInTheDocument();
      expect(screen.queryByText("Bar Option")).not.toBeInTheDocument();
    });
  });
});
