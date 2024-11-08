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
import reportError from "@/telemetry/reportError";
import { render, screen, userEvent } from "@/pageEditor/testHelpers";
import RemoteMultiSelectWidget from "@/components/form/widgets/RemoteMultiSelectWidget";
import { sanitizedIntegrationConfigFactory } from "@/testUtils/factories/integrationFactories";
import { waitFor } from "@testing-library/react";
import FieldTemplateLocalErrorContext from "@/components/form/widgets/FieldTemplateLocalErrorContext";

jest.mock("@/telemetry/reportError");
const reportErrorSpy = jest.mocked(reportError);

const setLocalErrorSpy = jest.fn();

const OPTIONS = [
  { value: 1, label: "Option One" },
  { value: 2, label: "Option Two" },
  { value: 3, label: "Option Three" },
  { value: 4, label: "Option Four" },
];

describe("RemoteMultiSelectWidget", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should render options normally when optionsFactory is a promise", async () => {
    const optionsFactory = Promise.resolve(OPTIONS);
    render(
      <RemoteMultiSelectWidget
        name="test"
        value={[]}
        onChange={jest.fn()}
        optionsFactory={optionsFactory}
        config={null}
      />,
    );

    await expect(screen.findByRole("combobox")).resolves.toBeInTheDocument();
    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.getByText("Option One")).toBeInTheDocument();
    expect(screen.getByText("Option Two")).toBeInTheDocument();
    expect(screen.getByText("Option Three")).toBeInTheDocument();
    expect(screen.getByText("Option Four")).toBeInTheDocument();
  });

  it("should render normally when one option is selected", async () => {
    const optionsFactory = Promise.resolve(OPTIONS);
    render(
      <RemoteMultiSelectWidget
        name="test"
        value={[1]}
        onChange={jest.fn()}
        optionsFactory={optionsFactory}
        config={null}
      />,
    );

    await expect(screen.findByRole("combobox")).resolves.toBeInTheDocument();
    expect(screen.getByText("Option One")).toBeInTheDocument();
    expect(screen.queryByText("Option Two")).not.toBeInTheDocument();
    expect(screen.queryByText("Option Three")).not.toBeInTheDocument();
    expect(screen.queryByText("Option Four")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("combobox"));
    // Multi-select filters out any selected options from the dropdown, so these all should appear once
    expect(screen.getByText("Option One")).toBeInTheDocument();
    expect(screen.getByText("Option Two")).toBeInTheDocument();
    expect(screen.getByText("Option Three")).toBeInTheDocument();
    expect(screen.getByText("Option Four")).toBeInTheDocument();
  });

  it("should render normally when multiple options are selected", async () => {
    const optionsFactory = Promise.resolve(OPTIONS);
    render(
      <RemoteMultiSelectWidget
        name="test"
        value={[1, 2]}
        onChange={jest.fn()}
        optionsFactory={optionsFactory}
        config={null}
      />,
    );

    await expect(screen.findByRole("combobox")).resolves.toBeInTheDocument();
    expect(screen.getByText("Option One")).toBeInTheDocument();
    expect(screen.getByText("Option Two")).toBeInTheDocument();
    expect(screen.queryByText("Option Three")).not.toBeInTheDocument();
    expect(screen.queryByText("Option Four")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("combobox"));
    // Multi-select filters out any selected options from the dropdown, so these all should appear once
    expect(screen.getByText("Option One")).toBeInTheDocument();
    expect(screen.getByText("Option Two")).toBeInTheDocument();
    expect(screen.getByText("Option Three")).toBeInTheDocument();
    expect(screen.getByText("Option Four")).toBeInTheDocument();
  });

  it("should render options normally when optionsFactory is a factory not a promise", async () => {
    const optionsFactory = jest.fn().mockResolvedValue(OPTIONS);
    const config = sanitizedIntegrationConfigFactory();
    render(
      <RemoteMultiSelectWidget
        name="test"
        value={[]}
        onChange={jest.fn()}
        optionsFactory={optionsFactory}
        config={config}
      />,
    );

    await expect(screen.findByRole("combobox")).resolves.toBeInTheDocument();
    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.getByText("Option One")).toBeInTheDocument();
    expect(screen.getByText("Option Two")).toBeInTheDocument();
    expect(screen.getByText("Option Three")).toBeInTheDocument();
    expect(screen.getByText("Option Four")).toBeInTheDocument();
  });

  it("should call onChange properly when options are selected", async () => {
    const optionsFactory = jest.fn().mockResolvedValue(OPTIONS);
    const config = sanitizedIntegrationConfigFactory();
    const onChangeSpy = jest.fn();
    const { rerender } = render(
      <RemoteMultiSelectWidget
        name="test"
        value={[]}
        onChange={onChangeSpy}
        optionsFactory={optionsFactory}
        config={config}
      />,
    );

    await expect(screen.findByRole("combobox")).resolves.toBeInTheDocument();
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByText("Option One"));

    // Expect MultiSelectLike event object passed to onChange
    expect(onChangeSpy).toHaveBeenCalledWith({
      target: {
        value: [1],
        name: "test",
        options: OPTIONS,
      },
    });

    rerender(
      <RemoteMultiSelectWidget
        name="test"
        value={[1]}
        onChange={onChangeSpy}
        optionsFactory={optionsFactory}
        config={config}
      />,
    );

    expect(screen.getByText("Option One")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByText("Option Two"));
    expect(onChangeSpy).toHaveBeenCalledWith({
      target: {
        value: [1, 2],
        name: "test",
        options: OPTIONS,
      },
    });

    rerender(
      <RemoteMultiSelectWidget
        name="test"
        value={[1, 2]}
        onChange={onChangeSpy}
        optionsFactory={optionsFactory}
        config={config}
      />,
    );

    expect(screen.getByText("Option One")).toBeInTheDocument();
    expect(screen.getByText("Option Two")).toBeInTheDocument();
    expect(screen.queryByText("Option Three")).not.toBeInTheDocument();
  });

  it("should report error and set local error message when optionsFactory returns an error", async () => {
    const error = new Error("Test error");
    const optionsFactory = jest.fn().mockRejectedValue(error);
    const config = sanitizedIntegrationConfigFactory();
    render(
      <FieldTemplateLocalErrorContext.Provider
        value={{ setLocalError: setLocalErrorSpy }}
      >
        <RemoteMultiSelectWidget
          name="test"
          value={[]}
          onChange={jest.fn()}
          optionsFactory={optionsFactory}
          config={config}
        />
      </FieldTemplateLocalErrorContext.Provider>,
    );

    await waitFor(() => {
      expect(reportErrorSpy).toHaveBeenCalledWith(error);
    });
    expect(setLocalErrorSpy).toHaveBeenCalledWith("Test error");
  });

  it("should clear the error properly when optionsFactory returns a valid result after an error", async () => {
    const error = new Error("Test error");
    const optionsFactory = jest.fn().mockRejectedValue(error);
    const config = sanitizedIntegrationConfigFactory();
    const { rerender } = render(
      <FieldTemplateLocalErrorContext.Provider
        value={{ setLocalError: setLocalErrorSpy }}
      >
        <RemoteMultiSelectWidget
          name="test"
          value={[]}
          onChange={jest.fn()}
          optionsFactory={optionsFactory}
          config={config}
        />
      </FieldTemplateLocalErrorContext.Provider>,
    );

    await waitFor(() => {
      expect(setLocalErrorSpy).toHaveBeenCalledWith("Test error");
    });
    expect(reportErrorSpy).toHaveBeenCalledWith(error);

    const newOptionsFactory = jest.fn().mockResolvedValue(OPTIONS);
    rerender(
      <FieldTemplateLocalErrorContext.Provider
        value={{ setLocalError: setLocalErrorSpy }}
      >
        <RemoteMultiSelectWidget
          name="test"
          value={[]}
          onChange={jest.fn()}
          optionsFactory={newOptionsFactory}
          config={config}
        />
      </FieldTemplateLocalErrorContext.Provider>,
    );

    await waitFor(() => {
      expect(setLocalErrorSpy).toHaveBeenCalledWith(null);
    });

    // React team recommends keeping duplicate analytics calls in development mode:
    // https://react.dev/learn/synchronizing-with-effects#sending-analytics
    expect(reportErrorSpy).toHaveBeenCalledTimes(2);
  });
});
