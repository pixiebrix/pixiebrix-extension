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
import PackageHistory from "@/extensionConsole/pages/packageEditor/PackageHistory";
import { act, screen, waitFor } from "@testing-library/react";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import selectEvent from "react-select-event";
import { waitForEffect } from "@/testUtils/testHelpers";
import { render } from "@/extensionConsole/testHelpers";
import { type Package, type PackageVersionDeprecated } from "@/types/contract";
import { type Timestamp } from "@/types/stringTypes";
import { DefinitionKinds } from "@/types/registryTypes";

const axiosMock = new MockAdapter(axios);

const findDiffEditor = (container: HTMLElement) =>
  // eslint-disable-next-line testing-library/no-node-access -- ace editor is not loaded/rendered in a normal way
  container.querySelector("#DIFF_EDITOR_DIV");

describe("PackageHistory", () => {
  const testPackageId = uuidSequence(1);

  const renderPackageHistory = async () => {
    const utils = render(<PackageHistory packageId={testPackageId} />);
    // Wait for the currentVersion effect to resolve
    await waitForEffect();
    return utils;
  };

  it("renders select components for choosing versions and displays the diff", async () => {
    const testVersions: PackageVersionDeprecated[] = [
      {
        id: testPackageId,
        version: "1.0.1",
        config: {},
        raw_config: "some big yaml file",
        created_at: "2024-01-24T20:55:41.263846Z" as Timestamp,
        updated_at: "2024-01-26T23:58:12.270168Z" as Timestamp,
      },
      {
        id: testPackageId,
        version: "1.0.0",
        config: {},
        raw_config: "some big yaml file2",
        created_at: "2024-01-20T16:55:41.263846Z" as Timestamp,
        updated_at: "2024-01-22T18:58:12.270168Z" as Timestamp,
      },
    ];

    const testPackage: Package = {
      id: testPackageId,
      name: "@pixies/ai/chatgpt-sidebar",
      kind: DefinitionKinds.MOD,
      version: "1.0.1",
      config: "some config yaml",
      public: true,
      organizations: [],
      updated_at: "2024-01-26T23:58:12.270168Z" as Timestamp,
      verbose_name: "AI Copilot",
      share_dependencies: false,
    };
    axiosMock
      .onGet(/api\/bricks\/[\w-]*\/versions\/$/)
      .reply(200, testVersions);
    axiosMock.onGet(/api\/bricks\/[\w-]*\/$/).reply(200, testPackage);

    const { container } = await renderPackageHistory();

    // The diff editor should not be rendered yet.
    expect(findDiffEditor(container)).not.toBeInTheDocument();

    // There should be two Selects rendered
    const selectInputs = screen.getAllByRole("combobox");
    expect(selectInputs).toHaveLength(2);

    // Only one of the selects should have a placeholder shown, and the other should display the current version
    const selectPlaceholderTexts =
      await screen.findAllByText("Select a version");
    await waitFor(() => {
      expect(selectPlaceholderTexts).toHaveLength(1);
    });
    expect(screen.getByText("1.0.1 (current)")).toBeInTheDocument();

    // Open the second select
    await act(async () => {
      selectEvent.openMenu(selectInputs[1]!);
    });

    // The expected options are displayed
    expect(
      screen.getByRole("option", { name: "1.0.1 (current) 1/26/2024" }),
    ).toBeVisible();
    const olderVersion = screen.getByRole("option", {
      name: "1.0.0 1/22/2024",
    });
    expect(olderVersion).toBeVisible();

    // Selecting another version should then display the diff editor
    await selectEvent.select(selectInputs[1]!, "1.0.0");
    await waitForEffect();
    expect(findDiffEditor(container)).toBeInTheDocument();
  });
});
