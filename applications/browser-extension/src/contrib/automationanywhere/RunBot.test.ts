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

import { RunBot } from "./RunBot";
import { unsafeAssumeValidArg } from "../../runtime/runtimeTypes";
import { uuidv4 } from "../../types/helpers";
import {
  getUserData,
  getCachedAuthData,
  performConfiguredRequestInBackground,
} from "../../background/messenger/api";
import {
  type AuthData,
  type SanitizedIntegrationConfig,
} from "../../integrations/integrationTypes";
import {
  CONTROL_ROOM_OAUTH_INTEGRATION_ID,
  CONTROL_ROOM_TOKEN_INTEGRATION_ID,
} from "../../integrations/constants";
import { brickOptionsFactory } from "../../testUtils/factories/runtimeFactories";
import { setPlatform } from "../../platform/platformContext";
import { platformMock as platform } from "../../testUtils/platformMock";
import type { Nullishable } from "../../utils/nullishUtils";
import type { NetworkRequestConfig } from "../../types/networkTypes";

jest.mock("../../background/messenger/api", () => ({
  getUserData: jest.fn().mockRejectedValue(new Error("Not mocked")),
  getCachedAuthData: jest.fn().mockRejectedValue(new Error("Not mocked")),
  performConfiguredRequestInBackground: jest.fn().mockResolvedValue({
    status: 201,
    data: {},
    $$proxied: false,
  }),
}));

const performConfiguredRequestInBackgroundMock = jest.mocked(
  performConfiguredRequestInBackground,
);

const getCachedAuthDataMock = jest.mocked(getCachedAuthData);
const getUserDataMock = jest.mocked(getUserData);

const brick = new RunBot();

const tokenAuthId = uuidv4();

const CE_CONTROL_ROOM_URL =
  "https://community2.cloud-2.automationanywhere.digital";
const EE_CONTROL_ROOM_URL = "https://custom.dev";
const FILE_ID = "456";
const DEVICE_ID = "123";
const DEVICE_POOL_ID = "012";
const CONTROL_ROOM_USER_ID = 999;
const UNATTENDED_RUN_AS_USER_ID = 1000;
const DEPLOYMENT_ID = "789";

beforeEach(() => {
  // The aaApi module uses the platform global
  setPlatform({
    ...platform,
    request: async <TData>(
      integrationConfig: Nullishable<SanitizedIntegrationConfig>,
      requestConfig: NetworkRequestConfig,
    ) =>
      performConfiguredRequestInBackgroundMock<TData>(
        integrationConfig,
        requestConfig,
        { interactiveLogin: false },
      ),
  });
});

describe("Automation Anywhere - RunBot", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("run Community Edition bot", async () => {
    performConfiguredRequestInBackgroundMock.mockResolvedValue({
      status: 201,
      statusText: "Created",
      data: {},
      $$proxied: false,
    });

    const values = await brick.run(
      unsafeAssumeValidArg({
        service: {
          id: tokenAuthId,
          proxy: false,
          serviceId: CONTROL_ROOM_TOKEN_INTEGRATION_ID,
          config: {
            controlRoomUrl: CE_CONTROL_ROOM_URL,
          },
        },
        workspaceType: "private",
        deviceId: DEVICE_ID,
        fileId: FILE_ID,
        data: {},
      }),
      brickOptionsFactory({ platform }),
    );

    expect(performConfiguredRequestInBackgroundMock).toHaveBeenCalledWith(
      {
        config: {
          controlRoomUrl: CE_CONTROL_ROOM_URL,
        },
        id: tokenAuthId,
        proxy: false,
        serviceId: CONTROL_ROOM_TOKEN_INTEGRATION_ID,
      },
      {
        data: {
          botInput: {},
          currentUserDeviceId: DEVICE_ID,
          fileId: FILE_ID,
          scheduleType: "INSTANT",
        },
        method: "post",
        url: "/v2/automations/deploy",
      },
      { interactiveLogin: false },
    );

    // CE returns blank object
    expect(values).toStrictEqual({});
  });

  it("runs private unattended Enterprise Edition bot using token authentication", async () => {
    performConfiguredRequestInBackgroundMock.mockResolvedValue({
      status: 201,
      statusText: "Created",
      data: {
        deploymentId: DEPLOYMENT_ID,
      },
      $$proxied: false,
    });

    getCachedAuthDataMock.mockResolvedValue({
      user: { id: CONTROL_ROOM_USER_ID },
      _oauthBrand: null,
    } as AuthData);

    const values = await brick.run(
      unsafeAssumeValidArg({
        service: {
          id: tokenAuthId,
          proxy: false,
          serviceId: CONTROL_ROOM_TOKEN_INTEGRATION_ID,
          config: {
            controlRoomUrl: EE_CONTROL_ROOM_URL,
          },
        },
        workspaceType: "private",
        poolIds: [DEVICE_POOL_ID],
        fileId: FILE_ID,
        runAsUserIds: [UNATTENDED_RUN_AS_USER_ID],
        data: {},
      }),
      brickOptionsFactory({ platform }),
    );

    expect(getCachedAuthDataMock).not.toHaveBeenCalled();

    expect(performConfiguredRequestInBackgroundMock).toHaveBeenCalledWith(
      {
        config: {
          controlRoomUrl: EE_CONTROL_ROOM_URL,
        },
        id: tokenAuthId,
        proxy: false,
        serviceId: CONTROL_ROOM_TOKEN_INTEGRATION_ID,
      },
      {
        data: {
          botInput: {},
          fileId: FILE_ID,
          numOfRunAsUsersToUse: 1,
          overrideDefaultDevice: true,
          poolIds: [DEVICE_POOL_ID],
          runAsUserIds: [UNATTENDED_RUN_AS_USER_ID],
        },
        method: "post",
        url: "/v3/automations/deploy",
      },
      { interactiveLogin: false },
    );

    // CE returns blank object
    expect(values).toStrictEqual({
      deploymentId: DEPLOYMENT_ID,
    });
  });

  it("runs public attended Enterprise Edition bot using token configuration", async () => {
    performConfiguredRequestInBackgroundMock.mockResolvedValue({
      status: 201,
      statusText: "Created",
      data: {
        deploymentId: DEPLOYMENT_ID,
      },
      $$proxied: false,
    });

    getCachedAuthDataMock.mockResolvedValue({
      user: { id: CONTROL_ROOM_USER_ID },
      _oauthBrand: null,
    } as AuthData);

    const values = await brick.run(
      unsafeAssumeValidArg({
        service: {
          id: tokenAuthId,
          proxy: false,
          serviceId: CONTROL_ROOM_TOKEN_INTEGRATION_ID,
          config: {
            controlRoomUrl: EE_CONTROL_ROOM_URL,
          },
        },
        workspaceType: "public",
        isAttended: true,
        fileId: FILE_ID,
        data: {},
      }),
      brickOptionsFactory({ platform }),
    );

    expect(getCachedAuthDataMock).toHaveBeenCalledWith(tokenAuthId);

    expect(performConfiguredRequestInBackgroundMock).toHaveBeenCalledWith(
      {
        config: {
          controlRoomUrl: EE_CONTROL_ROOM_URL,
        },
        id: tokenAuthId,
        proxy: false,
        serviceId: CONTROL_ROOM_TOKEN_INTEGRATION_ID,
      },
      {
        data: {
          botInput: {},
          fileId: FILE_ID,
          numOfRunAsUsersToUse: 1,
          overrideDefaultDevice: false,
          poolIds: [],
          runAsUserIds: [CONTROL_ROOM_USER_ID],
        },
        method: "post",
        url: "/v3/automations/deploy",
      },
      { interactiveLogin: false },
    );

    // CE returns blank object
    expect(values).toStrictEqual({
      deploymentId: DEPLOYMENT_ID,
    });
  });

  it("runs unattended public Enterprise Edition bot using token authentication", async () => {
    performConfiguredRequestInBackgroundMock.mockResolvedValue({
      status: 201,
      statusText: "Created",
      data: {
        deploymentId: DEPLOYMENT_ID,
      },
      $$proxied: false,
    });

    getCachedAuthDataMock.mockResolvedValue({
      user: { id: CONTROL_ROOM_USER_ID },
      _oauthBrand: null,
    } as AuthData);

    const values = await brick.run(
      unsafeAssumeValidArg({
        service: {
          id: tokenAuthId,
          proxy: false,
          serviceId: CONTROL_ROOM_TOKEN_INTEGRATION_ID,
          config: {
            controlRoomUrl: EE_CONTROL_ROOM_URL,
          },
        },
        workspaceType: "public",
        deviceId: DEVICE_ID,
        fileId: FILE_ID,
        data: {},
        runAsUserIds: [UNATTENDED_RUN_AS_USER_ID],
      }),
      brickOptionsFactory({ platform }),
    );

    expect(performConfiguredRequestInBackgroundMock).toHaveBeenCalledWith(
      {
        config: {
          controlRoomUrl: EE_CONTROL_ROOM_URL,
        },
        id: tokenAuthId,
        proxy: false,
        serviceId: CONTROL_ROOM_TOKEN_INTEGRATION_ID,
      },
      {
        data: {
          botInput: {},
          fileId: FILE_ID,
          numOfRunAsUsersToUse: 1,
          overrideDefaultDevice: false,
          poolIds: [],
          runAsUserIds: [UNATTENDED_RUN_AS_USER_ID],
        },
        method: "post",
        url: "/v3/automations/deploy",
      },
      { interactiveLogin: false },
    );

    expect(values).toStrictEqual({
      deploymentId: DEPLOYMENT_ID,
    });
  });

  it("runs Enterprise Edition bot in attended mode using oauth2 configuration", async () => {
    performConfiguredRequestInBackgroundMock.mockResolvedValue({
      status: 201,
      statusText: "Created",
      data: {
        deploymentId: DEPLOYMENT_ID,
      },
      $$proxied: false,
    });

    getUserDataMock.mockResolvedValue({
      partnerPrincipals: [
        {
          controlRoomUrl: new URL(EE_CONTROL_ROOM_URL),
          controlRoomUserId: CONTROL_ROOM_USER_ID,
        },
      ],
    });

    const values = await brick.run(
      unsafeAssumeValidArg({
        service: {
          id: tokenAuthId,
          proxy: false,
          serviceId: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
          config: {
            controlRoomUrl: EE_CONTROL_ROOM_URL,
          },
        },
        workspaceType: "public",
        isAttended: true,
        fileId: FILE_ID,
        data: {},
      }),
      brickOptionsFactory({ platform }),
    );

    expect(performConfiguredRequestInBackgroundMock).toHaveBeenCalledWith(
      {
        config: {
          controlRoomUrl: EE_CONTROL_ROOM_URL,
        },
        id: tokenAuthId,
        proxy: false,
        serviceId: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
      },
      {
        data: {
          botInput: {},
          fileId: FILE_ID,
          numOfRunAsUsersToUse: 1,
          overrideDefaultDevice: false,
          poolIds: [],
          runAsUserIds: [CONTROL_ROOM_USER_ID],
        },
        method: "post",
        url: "/v3/automations/deploy",
      },
      { interactiveLogin: false },
    );

    expect(values).toStrictEqual({
      deploymentId: DEPLOYMENT_ID,
    });
  });

  it("awaits Enterprise Edition result", async () => {
    const activityId = "288bf36b-e902-4ed2-a5bf-b5534eca137e_6bb3be11a848a48b";

    performConfiguredRequestInBackgroundMock.mockImplementation(
      async (service, request) => {
        if (request.url.includes("deploy")) {
          return {
            status: 201,
            statusText: "Created",
            data: {
              deploymentId: DEPLOYMENT_ID,
            },
            $$proxied: false,
          };
        }

        if (request.url.endsWith("/v3/activity/list")) {
          return {
            status: 200,
            statusText: "Success",
            data: {
              list: [
                {
                  id: activityId,
                  status: "COMPLETED",
                },
              ],
            },
            $$proxied: false,
          };
        }

        if (request.url.endsWith(`/v3/activity/execution/${activityId}`)) {
          return {
            status: 200,
            statusText: "Success",
            data: {
              id: activityId,
              botOutVariables: {
                values: {
                  foo: {
                    type: "STRING",
                    string: "bar",
                    number: "",
                    boolean: "",
                  },
                },
              },
            },
          };
        }

        throw new Error("Unexpected request");
      },
    );

    getCachedAuthDataMock.mockResolvedValue({
      user: { id: CONTROL_ROOM_USER_ID },
      _oauthBrand: null,
    } as AuthData);

    const values = await brick.run(
      unsafeAssumeValidArg({
        service: {
          id: tokenAuthId,
          proxy: false,
          serviceId: CONTROL_ROOM_TOKEN_INTEGRATION_ID,
          config: {
            controlRoomUrl: EE_CONTROL_ROOM_URL,
          },
        },
        workspaceType: "public",
        deviceId: DEVICE_ID,
        fileId: FILE_ID,
        data: {},
        runAsUserIds: [UNATTENDED_RUN_AS_USER_ID],
        awaitResult: true,
      }),
      brickOptionsFactory({ platform }),
    );

    expect(performConfiguredRequestInBackgroundMock).toHaveBeenCalledWith(
      {
        config: {
          controlRoomUrl: EE_CONTROL_ROOM_URL,
        },
        id: tokenAuthId,
        proxy: false,
        serviceId: CONTROL_ROOM_TOKEN_INTEGRATION_ID,
      },
      {
        data: {
          botInput: {},
          fileId: FILE_ID,
          numOfRunAsUsersToUse: 1,
          overrideDefaultDevice: false,
          poolIds: [],
          runAsUserIds: [UNATTENDED_RUN_AS_USER_ID],
        },
        method: "post",
        url: "/v3/automations/deploy",
      },
      { interactiveLogin: false },
    );

    expect(values).toStrictEqual({
      foo: "bar",
    });
  });
});
