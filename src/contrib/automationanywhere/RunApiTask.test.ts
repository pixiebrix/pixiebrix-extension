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

import { setPlatform } from "@/platform/platformContext";
import { platformMock } from "@/testUtils/platformMock";
import { RunApiTask } from "@/contrib/automationanywhere/RunApiTask";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import { type Nullishable } from "@/utils/nullishUtils";
import { performConfiguredRequest } from "@/background/requests";
import {
  remoteIntegrationConfigurationFactory,
  sanitizedIntegrationConfigFactory,
  secretsConfigFactory,
} from "@/testUtils/factories/integrationFactories";
import { brickOptionsFactory } from "@/testUtils/factories/runtimeFactories";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { appApiMock, onApiGet, onApiPost } from "@/testUtils/appApiMock";
import { TEST_overrideFeatureFlags } from "@/auth/featureFlagStorage";
import { fromJS } from "@/integrations/UserDefinedIntegration";
import controlRoomOAuth2Service from "@contrib/integrations/automation-anywhere-oauth2.yaml";
import integrationRegistry from "@/integrations/registry";
import { integrationConfigLocator } from "@/background/integrationConfigLocator";
import { type UUID } from "@/types/stringTypes";
import { setCachedAuthData } from "@/background/auth/authStorage";
import { autoUUIDSequence } from "@/testUtils/factories/stringFactories";
import { sleep } from "@/utils/timeUtils";
import { type NetworkRequestConfig } from "@/types/networkTypes";

jest.mock("@/utils/timeUtils", () => {
  const actual = jest.requireActual("@/utils/timeUtils");

  return {
    ...actual,
    sleep: jest.fn(() => {}),
  };
});

const sleepMock = jest.mocked(sleep);

const runApiTaskBrick = new RunApiTask();

const CONTROL_ROOM_URL = "https://my-control-room.automationanywhere.com";
const BOT_ID = "1234";
const SHARED_RUN_AS_USER_ID = 5678;
const DATA = { key: "value" };
const AUTOMATION_NAME = "My Test Automation";

const oauth2Integration = fromJS(controlRoomOAuth2Service as any);
let configId: UUID | null = null;

beforeEach(async () => {
  await TEST_overrideFeatureFlags([]);

  setPlatform({
    ...platformMock,
    request: async <TData>(
      integrationConfig: Nullishable<SanitizedIntegrationConfig>,
      requestConfig: NetworkRequestConfig,
    ) =>
      performConfiguredRequest<TData>(integrationConfig, requestConfig, {
        interactiveLogin: false,
      }),
  });

  integrationRegistry.clear();
  integrationRegistry.register([oauth2Integration]);

  const config = remoteIntegrationConfigurationFactory({
    service: {
      name: oauth2Integration.id,
      config: {
        metadata: {
          id: oauth2Integration.id,
          name: oauth2Integration.name,
        },
      },
    },
    config: secretsConfigFactory({
      controlRoomUrl: CONTROL_ROOM_URL,
    }),
    pushdown: true,
  });
  configId = config.id;
  appApiMock.reset();
  appApiMock.onGet("/api/services/shared/").reply(200, [config]);
  await integrationConfigLocator.refresh();

  await setCachedAuthData(configId, {
    access_token: "testtoken1234",
  });
});

describe("Automation Anywhere - Run API Task", () => {
  test("given not awaiting response, when called normally, should return the taskResponse", async () => {
    const taskResponse = {
      deploymentId: "1234",
      automationName: AUTOMATION_NAME,
    };
    onApiPost("/v4/automations/deploy").reply(200, taskResponse);

    const response = await runApiTaskBrick.run(
      unsafeAssumeValidArg({
        integrationConfig: sanitizedIntegrationConfigFactory({
          id: configId!,
          serviceId: oauth2Integration.id,
        }),
        botId: BOT_ID,
        sharedRunAsUserId: SHARED_RUN_AS_USER_ID,
        data: DATA,
        automationName: AUTOMATION_NAME,
        awaitResult: false,
      }),
      brickOptionsFactory({ platform: platformMock }),
    );

    expect(response).toEqual(taskResponse);
  });

  test("given awaiting response, when called normally, should poll until response is ready", async () => {
    const deploymentId = autoUUIDSequence();
    const activityId = autoUUIDSequence();
    const taskResponse = {
      deploymentId,
      automationName: AUTOMATION_NAME,
    };
    onApiPost("/v4/automations/deploy").reply(200, taskResponse);

    // Task starts in QUEUED status
    onApiPost("/v3/activity/list").replyOnce(200, {
      list: [
        {
          id: activityId,
          automationName: AUTOMATION_NAME,
          deploymentId,
          status: "QUEUED",
        },
      ],
    });
    // Task transitions to PENDING_EXECUTION status
    onApiPost("/v3/activity/list").replyOnce(200, {
      list: [
        {
          id: activityId,
          automationName: AUTOMATION_NAME,
          deploymentId,
          status: "PENDING_EXECUTION",
        },
      ],
    });
    // Task completes
    onApiPost("/v3/activity/list").replyOnce(200, {
      list: [
        {
          id: activityId,
          automationName: AUTOMATION_NAME,
          deploymentId,
          status: "COMPLETED",
        },
      ],
    });

    onApiGet(`/v3/activity/execution/${activityId}`).reply(200, {
      id: activityId,
      botOutVariables: {
        values: {
          output: {
            type: "STRING",
            string: "output value",
          },
        },
      },
    });

    const response = await runApiTaskBrick.run(
      unsafeAssumeValidArg({
        integrationConfig: sanitizedIntegrationConfigFactory({
          id: configId!,
          serviceId: oauth2Integration.id,
        }),
        botId: BOT_ID,
        sharedRunAsUserId: SHARED_RUN_AS_USER_ID,
        data: DATA,
        automationName: AUTOMATION_NAME,
        awaitResult: true,
        maxWaitMillis: 10_000,
      }),
      brickOptionsFactory({ platform: platformMock }),
    );

    expect(response).toEqual({ output: "output value" });
  });

  test("given awaiting response with timeout, when called and response times out, should return error message", async () => {
    sleepMock.mockImplementation(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
    });

    const deploymentId = autoUUIDSequence();
    const activityId = autoUUIDSequence();
    const taskResponse = {
      deploymentId,
      automationName: AUTOMATION_NAME,
    };
    onApiPost("/v4/automations/deploy").reply(200, taskResponse);

    // Task starts in QUEUED status
    onApiPost("/v3/activity/list").replyOnce(200, {
      list: [
        {
          id: activityId,
          automationName: AUTOMATION_NAME,
          deploymentId,
          status: "QUEUED",
        },
      ],
    });
    // Task transitions to, and remains in, PENDING_EXECUTION status
    onApiPost("/v3/activity/list").reply(200, {
      list: [
        {
          id: activityId,
          automationName: AUTOMATION_NAME,
          deploymentId,
          status: "PENDING_EXECUTION",
        },
      ],
    });

    await expect(
      runApiTaskBrick.run(
        unsafeAssumeValidArg({
          integrationConfig: sanitizedIntegrationConfigFactory({
            id: configId!,
            serviceId: oauth2Integration.id,
          }),
          botId: BOT_ID,
          sharedRunAsUserId: SHARED_RUN_AS_USER_ID,
          data: DATA,
          automationName: AUTOMATION_NAME,
          awaitResult: true,
          maxWaitMillis: 100,
        }),
        brickOptionsFactory({ platform: platformMock }),
      ),
    ).rejects.toThrow("Bot did not finish in 0 seconds");
  });
});
