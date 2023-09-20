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
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { render } from "@/extensionConsole/testHelpers";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Formik } from "formik";
import { CONTROL_ROOM_TOKEN_INTEGRATION_ID } from "@/services/constants";
import { AUTOMATION_ANYWHERE_RUN_BOT_ID } from "@/contrib/automationanywhere/RunBot";
import BotOptions from "@/contrib/automationanywhere/BotOptions";
import useSanitizedIntegrationConfigFormikAdapter from "@/services/useSanitizedIntegrationConfigFormikAdapter";
import { makeVariableExpression } from "@/runtime/expressionCreators";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { type SanitizedConfig } from "@/types/integrationTypes";
import { useAuthOptions } from "@/hooks/auth";
import { valueToAsyncState } from "@/utils/asyncStateUtils";
import { menuItemFormStateFactory } from "@/testUtils/factories/pageEditorFactories";
import {
  integrationDependencyFactory,
  sanitizedIntegrationConfigFactory,
} from "@/testUtils/factories/integrationFactories";
import { validateOutputKey } from "@/runtime/runtimeTypes";

jest.mock("@/services/useSanitizedIntegrationConfigFormikAdapter", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const useSanitizedIntegrationConfigFormikAdapterMock = jest.mocked(
  useSanitizedIntegrationConfigFormikAdapter
);

jest.mock("@/hooks/auth", () => ({
  useAuthOptions: jest.fn(),
}));
jest.mock("@/hooks/auth");
jest.mock("@/contentScript/messenger/api");

function makeBaseState() {
  return menuItemFormStateFactory(
    {
      integrationDependencies: [
        integrationDependencyFactory({
          integrationId: CONTROL_ROOM_TOKEN_INTEGRATION_ID,
          outputKey: validateOutputKey("automationAnywhere"),
        }),
      ],
    },
    [
      {
        id: AUTOMATION_ANYWHERE_RUN_BOT_ID,
        config: {
          service: null,
          fileId: null,
          data: {},
        },
      },
    ]
  );
}

function renderOptions(formState: ModComponentFormState = makeBaseState()) {
  return render(
    <Formik onSubmit={jest.fn()} initialValues={formState}>
      <BotOptions name="extension.blockPipeline.0" configKey="config" />
    </Formik>
  );
}

beforeAll(() => {
  registerDefaultWidgets();
  jest.mocked(useAuthOptions).mockReturnValue(valueToAsyncState([]));
});

beforeEach(() => {
  useSanitizedIntegrationConfigFormikAdapterMock.mockReturnValue(
    valueToAsyncState(null)
  );
});

describe("BotOptions", () => {
  it("should require selected integration", async () => {
    const result = renderOptions();

    expect(result.queryByText("Workspace")).toBeNull();
    expect(result.container).toMatchSnapshot();
  });

  it("should render default enterprise fields for private workspace", async () => {
    const sanitizedConfig = sanitizedIntegrationConfigFactory({
      config: {
        controlRoomUrl: "https://control.room.com",
      } as unknown as SanitizedConfig,
    });
    useSanitizedIntegrationConfigFormikAdapterMock.mockReturnValue(
      valueToAsyncState(sanitizedConfig)
    );

    const base = makeBaseState();
    base.extension.blockPipeline[0].config.service = makeVariableExpression(
      "@automationAnywhere"
    );

    const result = renderOptions(base);

    expect(result.queryByText("Workspace")).not.toBeNull();
    expect(result.queryByText("Bot")).not.toBeNull();
    expect(result.queryByText("Run as Users")).toBeNull();
    expect(result.queryByText("Device Pools")).toBeNull();
    expect(result.queryByText("Await Result")).not.toBeNull();
    expect(result.queryByText("Result Timeout (Milliseconds)")).toBeNull();

    // There's non-determinism in React Selects ids: react-select-X-live-region
    // expect(result.container).toMatchSnapshot();
  });

  it("should render community fields", async () => {
    const sanitizedConfig = sanitizedIntegrationConfigFactory({
      config: {
        controlRoomUrl: "https://community2.cloud-2.automationanywhere.digital",
      } as unknown as SanitizedConfig,
    });
    useSanitizedIntegrationConfigFormikAdapterMock.mockReturnValue(
      valueToAsyncState(sanitizedConfig)
    );

    const base = makeBaseState();
    base.extension.blockPipeline[0].config.service = makeVariableExpression(
      "@automationAnywhere"
    );

    const result = renderOptions(base);

    // Community only supports private workspace, so we don't show the field
    expect(result.queryByText("Workspace")).toBeNull();
    expect(result.queryByText("Bot")).not.toBeNull();
    expect(result.queryByText("Run as Users")).toBeNull();
    expect(result.queryByText("Device Pools")).toBeNull();
    expect(result.queryByText("Await Result")).toBeNull();
    expect(result.queryByText("Result Timeout (Milliseconds)")).toBeNull();

    // There's non-determinism in React Selects ids: react-select-X-live-region
    // expect(result.container).toMatchSnapshot();
  });

  it("should render default enterprise fields for public workspace", async () => {
    const sanitizedConfig = sanitizedIntegrationConfigFactory({
      config: {
        controlRoomUrl: "https://control.room.com",
      } as unknown as SanitizedConfig,
    });
    useSanitizedIntegrationConfigFormikAdapterMock.mockReturnValue(
      valueToAsyncState(sanitizedConfig)
    );

    const base = makeBaseState();
    base.extension.blockPipeline[0].config.workspaceType = "public";
    base.extension.blockPipeline[0].config.service = makeVariableExpression(
      "@automationAnywhere"
    );

    const result = renderOptions(base);

    expect(result.queryByText("Workspace")).not.toBeNull();
    expect(result.queryByText("Bot")).not.toBeNull();
    expect(result.queryByText("Attended")).not.toBeNull();
    expect(result.queryByText("Run as Users")).not.toBeNull();
    expect(result.queryByText("Device Pools")).not.toBeNull();
    expect(result.queryByText("Await Result")).not.toBeNull();
    expect(result.queryByText("Result Timeout (Milliseconds)")).toBeNull();

    // There's non-determinism in React Selects ids: react-select-X-live-region
    // expect(result.container).toMatchSnapshot();
  });

  it("should render attended enterprise fields for public workspace", async () => {
    const sanitizedConfig = sanitizedIntegrationConfigFactory({
      config: {
        controlRoomUrl: "https://control.room.com",
      } as unknown as SanitizedConfig,
    });
    useSanitizedIntegrationConfigFormikAdapterMock.mockReturnValue(
      valueToAsyncState(sanitizedConfig)
    );

    const base = makeBaseState();
    base.extension.blockPipeline[0].config.workspaceType = "public";
    base.extension.blockPipeline[0].config.isAttended = true;
    base.extension.blockPipeline[0].config.service = makeVariableExpression(
      "@automationAnywhere"
    );

    const result = renderOptions(base);

    expect(result.queryByText("Workspace")).not.toBeNull();
    expect(result.queryByText("Bot")).not.toBeNull();
    expect(result.queryByText("Attended")).not.toBeNull();
    expect(result.queryByText("Run as Users")).toBeNull();
    expect(result.queryByText("Device Pools")).toBeNull();
    expect(result.queryByText("Await Result")).not.toBeNull();
    expect(result.queryByText("Result Timeout (Milliseconds)")).toBeNull();

    // There's non-determinism in React Selects ids: react-select-X-live-region
    // expect(result.container).toMatchSnapshot();
  });

  it("should render result timeout", async () => {
    const sanitizedConfig = sanitizedIntegrationConfigFactory({
      config: {
        controlRoomUrl: "https://control.room.com",
      } as unknown as SanitizedConfig,
    });
    useSanitizedIntegrationConfigFormikAdapterMock.mockReturnValue(
      valueToAsyncState(sanitizedConfig)
    );

    const base = makeBaseState();
    base.extension.blockPipeline[0].config.awaitResult = true;
    base.extension.blockPipeline[0].config.service = makeVariableExpression(
      "@automationAnywhere"
    );

    const result = renderOptions(base);

    expect(result.queryByText("Await Result")).not.toBeNull();
    expect(result.queryByText("Result Timeout (Milliseconds)")).not.toBeNull();
  });
});
