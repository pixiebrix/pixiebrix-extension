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
import { render } from "@/extensionConsole/testHelpers";
import ActivateStandaloneModDefinitionIdPage from "@/extensionConsole/pages/activateMod/ActivateStandaloneModDefinitionIdPage";
import { waitForEffect } from "@/testUtils/testHelpers";
import { screen } from "@testing-library/react";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { appApiMock } from "@/testUtils/appApiMock";
import { type StandaloneModDefinition } from "@/types/contract";
import useActivateMod, {
  type ActivateModFormCallback,
} from "@/activation/useActivateMod";
import { autoUUIDSequence } from "@/testUtils/factories/stringFactories";
import { standaloneModDefinitionFactory } from "@/testUtils/factories/modComponentFactories";
import { Route } from "react-router-dom";
import { INNER_SCOPE } from "@/types/registryTypes";
import { isInternalRegistryId } from "@/utils/registryUtils";

registerDefaultWidgets();

const testDefinitionId = autoUUIDSequence();

const activateModCallbackMock =
  // eslint-disable-next-line no-restricted-syntax -- TODO
  jest.fn() as jest.MockedFunction<ActivateModFormCallback>;

jest.mock("@/activation/useActivateMod.ts");

const activateModHookMock = jest.mocked(useActivateMod);

global.chrome.commands.getAll = jest.fn();

function setupMocks(modDefinition: StandaloneModDefinition): void {
  appApiMock
    .onGet(`/api/extensions/${encodeURIComponent(modDefinition.id)}/`)
    .reply(200, modDefinition)
    // Databases, organizations, etc.
    .onGet()
    .reply(200, []);
}

beforeEach(() => {
  appApiMock.reset();
  jest.clearAllMocks();
  activateModHookMock.mockReturnValue(activateModCallbackMock);
});

const ActivateStandaloneModDefinitionIdPageWrapper: React.FC = () => (
  <MemoryRouter initialEntries={[`/extensions/install/${testDefinitionId}`]}>
    <Route path="/extensions/install/:modComponentId">
      <ActivateStandaloneModDefinitionIdPage />
    </Route>
  </MemoryRouter>
);

describe("ActivateStandaloneModDefinitionIdPage", () => {
  it("does not show internal mod id", async () => {
    setupMocks(
      standaloneModDefinitionFactory({
        id: testDefinitionId,
      }),
    );
    const { asFragment } = render(
      <ActivateStandaloneModDefinitionIdPageWrapper />,
    );
    await waitForEffect();

    expect(
      screen.queryByText(INNER_SCOPE, { exact: false }),
    ).not.toBeInTheDocument();

    expect(asFragment()).toMatchSnapshot();
  });

  it("activates", async () => {
    setupMocks(
      standaloneModDefinitionFactory({
        id: testDefinitionId,
      }),
    );
    render(<ActivateStandaloneModDefinitionIdPageWrapper />);
    await waitForEffect();

    await userEvent.click(screen.getByText("Activate"));

    await waitForEffect();
    expect(activateModCallbackMock).toHaveBeenCalledWith(
      {
        modComponents: { "0": true },
        optionsArgs: {},
        integrationDependencies: [],
      },
      expect.objectContaining({
        metadata: expect.objectContaining({
          id: expect.toSatisfy(isInternalRegistryId),
        }),
      }),
      { forceModComponentId: testDefinitionId },
    );
  });
});
