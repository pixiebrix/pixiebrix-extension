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

import { validateRegistryId } from "@/types/helpers";
import { mockAnimationsApi } from "jsdom-testing-mocks";
import { type UnknownObject } from "@/types";
import { define } from "cooky-cutter";
import {
  fromJS,
  type QuickBarProviderConfig,
  type QuickBarProviderDefinition,
} from "@/extensionPoints/quickBarProviderExtension";
import { type ResolvedExtension, RunReason } from "@/core";
import {
  extensionPointDefinitionFactory as genericExtensionPointFactory,
  uuidSequence,
} from "@/testUtils/factories";
import { type BlockPipeline } from "@/blocks/types";
import {
  getDocument,
  RootReader,
  tick,
} from "@/extensionPoints/extensionPointTestUtils";
import blockRegistry from "@/blocks/registry";
import userEvent from "@testing-library/user-event";
import quickBarRegistry from "@/components/quickBar/quickBarRegistry";
import { toggleQuickBar } from "@/components/quickBar/QuickBarApp";
import defaultActions from "@/components/quickBar/defaultActions";
import { waitForEffect } from "@/testUtils/testHelpers";

jest.mock("@/telemetry/logging", () => {
  const actual = jest.requireActual("@/telemetry/logging");
  return {
    ...actual,
    getLoggingConfig: jest.fn().mockResolvedValue({
      logValues: true,
    }),
  };
});

const rootReaderId = validateRegistryId("test/root-reader");

mockAnimationsApi();
const extensionPointFactory = (definitionOverrides: UnknownObject = {}) =>
  genericExtensionPointFactory({
    definition: define<QuickBarProviderDefinition>({
      type: "quickBarProvider",
      isAvailable: () => ({
        matchPatterns: ["*://*/*"],
      }),
      reader: () => [rootReaderId],
      ...definitionOverrides,
    }),
  });

const extensionFactory = define<ResolvedExtension<QuickBarProviderConfig>>({
  apiVersion: "v3",
  _resolvedExtensionBrand: undefined,
  id: uuidSequence,
  extensionPointId: (n: number) =>
    validateRegistryId(`test/extension-point-${n}`),
  _recipe: null,
  label: "Test Extension",
  config: define<QuickBarProviderConfig>({
    rootAction: {
      title: "Test Root Action",
    },
    generator: () => [] as BlockPipeline,
  }),
});

const rootReader = new RootReader();

beforeAll(() => {
  const html = getDocument("<div></div>").body.innerHTML;
  document.body.innerHTML = html;
});
const NUM_DEFAULT_QUICKBAR_ACTIONS = defaultActions.length;

describe("quickBarProviderExtension", () => {
  beforeEach(() => {
    blockRegistry.clear();
    blockRegistry.register(rootReader);
    rootReader.readCount = 0;
    rootReader.ref = undefined;
  });

  it("quick bar provider adds root action instantly", async () => {
    const user = userEvent.setup();

    const extensionPoint = fromJS(extensionPointFactory());

    extensionPoint.addExtension(
      extensionFactory({
        extensionPointId: extensionPoint.id,
      })
    );

    expect(quickBarRegistry.currentActions).toHaveLength(
      NUM_DEFAULT_QUICKBAR_ACTIONS
    );
    await extensionPoint.install();
    await extensionPoint.run({ reason: RunReason.MANUAL });

    expect(quickBarRegistry.currentActions).toHaveLength(
      NUM_DEFAULT_QUICKBAR_ACTIONS + 1
    );

    expect(rootReader.readCount).toBe(0);

    // QuickBar installation adds another div to the body
    expect(document.body.innerHTML).toEqual(
      '<div id="pixiebrix-quickbar-container"></div><div></div>'
    );

    // :shrug: I'm not sure how to get the kbar to show using shortcuts in jsdom, so just toggle manually
    await user.keyboard("[Ctrl] k");
    toggleQuickBar();

    await tick();

    // Should be showing the QuickBar portal. The innerHTML doesn't contain the QuickBar actions at this point
    // TODO: add quickbar visibility assertion

    extensionPoint.uninstall();

    expect(quickBarRegistry.currentActions).toHaveLength(
      NUM_DEFAULT_QUICKBAR_ACTIONS
    );

    // Toggle off the quickbar
    toggleQuickBar();
    await waitForEffect();
  });

  it("runs the generator on query change", async () => {
    const user = userEvent.setup();

    const extensionPoint = fromJS(extensionPointFactory());

    extensionPoint.addExtension(
      extensionFactory({
        extensionPointId: extensionPoint.id,
        config: {
          generator: [] as BlockPipeline,
        },
      })
    );

    await extensionPoint.install();
    await extensionPoint.run({ reason: RunReason.MANUAL });

    await tick();

    expect(quickBarRegistry.currentActions).toHaveLength(
      NUM_DEFAULT_QUICKBAR_ACTIONS
    );

    expect(rootReader.readCount).toBe(0);

    // QuickBar installation adds another div to the body
    expect(document.body.innerHTML).toEqual(
      '<div id="pixiebrix-quickbar-container"></div><div></div>'
    );

    // :shrug: I'm not sure how to get the kbar to show using shortcuts in jsdom, so just toggle manually
    await user.keyboard("[Ctrl] k");
    toggleQuickBar();

    await tick();

    // Should be showing the QuickBar portal. The innerHTML doesn't contain the QuickBar actions at this point
    expect(document.body.innerHTML).not.toEqual(
      '<div id="pixiebrix-quickbar-container"></div><div></div>'
    );

    // Getting an error here: make sure you apple `query.inputRefSetter`
    // await user.keyboard("abc");
    // Manually generate actions
    await quickBarRegistry.generateActions({
      query: "foo",
      rootActionId: undefined,
    });

    expect(rootReader.readCount).toBe(1);

    extensionPoint.uninstall();

    expect(quickBarRegistry.currentActions).toHaveLength(
      NUM_DEFAULT_QUICKBAR_ACTIONS
    );

    toggleQuickBar();
    await tick();
  });
});
