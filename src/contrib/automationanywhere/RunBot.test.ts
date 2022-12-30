/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { RunBot } from "@/contrib/automationanywhere/RunBot";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { uuidv4 } from "@/types/helpers";
import { uuidSequence } from "@/testUtils/factories";
import { type AuthData, type BlockOptions } from "@/core";
import {
  CONTROL_ROOM_OAUTH_SERVICE_ID,
  CONTROL_ROOM_SERVICE_ID,
} from "@/services/constants";
import {
  proxyService,
  getCachedAuthData,
  getUserData,
} from "@/background/messenger/api";

jest.mock("@/background/messenger/api", () => ({
  proxyService: jest.fn().mockResolvedValue({
    status: 201,
    data: {},
    $$proxied: false,
  }),
  getCachedAuthData: jest.fn().mockRejectedValue(new Error("Not mocked")),
  getUserData: jest.fn().mockRejectedValue(new Error("Not mocked")),
}));

const proxyServiceMock = proxyService as jest.MockedFunction<
  typeof proxyService
>;
const getCachedAuthDataMock = getCachedAuthData as jest.MockedFunction<
  typeof getCachedAuthData
>;
const getUserDataMock = getUserData as jest.MockedFunction<typeof getUserData>;

const brick = new RunBot();

const logger = new ConsoleLogger({
  extensionId: uuidSequence(0),
});

const tokenAuthId = uuidv4();

const CE_CONTROL_ROOM_URL =
  "https://community2.cloud-2.automationanywhere.digital";
const EE_CONTROL_ROOM_URL = "https://custom.dev";
const FILE_ID = "456";
const DEVICE_ID = "123";
const CONTROL_ROOM_USER_ID = 999;
const UNATTENDED_RUN_AS_USER_ID = 1000;
const DEPLOYMENT_ID = "789";

describe("Automation Anywhere - RunBot", () => {
  beforeEach(() => {
    proxyServiceMock.mockReset();
    getCachedAuthDataMock.mockReset();
    getUserDataMock.mockReset();
  });

  it("run Community Edition bot", async () => {
    proxyServiceMock.mockResolvedValue({
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
          serviceId: CONTROL_ROOM_SERVICE_ID,
          config: {
            controlRoomUrl: CE_CONTROL_ROOM_URL,
          },
        },
        workspaceType: "private",
        deviceId: DEVICE_ID,
        fileId: FILE_ID,
        data: {},
      }),
      { logger } as BlockOptions
    );

    expect(proxyServiceMock).toHaveBeenCalledWith(
      {
        config: {
          controlRoomUrl: CE_CONTROL_ROOM_URL,
        },
        id: tokenAuthId,
        proxy: false,
        serviceId: CONTROL_ROOM_SERVICE_ID,
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
      }
    );

    // CE returns blank object
    expect(values).toStrictEqual({});
  });

  it("runs private Enterprise Edition bot using token configuration", async () => {
    proxyServiceMock.mockResolvedValue({
      status: 201,
      statusText: "Created",
      data: {
        deploymentId: DEPLOYMENT_ID,
      },
      $$proxied: false,
    });

    getCachedAuthDataMock.mockResolvedValue({
      user: { id: CONTROL_ROOM_USER_ID },
      _oauthBrand: undefined,
    } as AuthData);

    const values = await brick.run(
      unsafeAssumeValidArg({
        service: {
          id: tokenAuthId,
          proxy: false,
          serviceId: CONTROL_ROOM_SERVICE_ID,
          config: {
            controlRoomUrl: EE_CONTROL_ROOM_URL,
          },
        },
        workspaceType: "private",
        deviceId: DEVICE_ID,
        fileId: FILE_ID,
        data: {},
      }),
      { logger } as BlockOptions
    );

    expect(getCachedAuthDataMock).toHaveBeenCalledWith(tokenAuthId);

    expect(proxyServiceMock).toHaveBeenCalledWith(
      {
        config: {
          controlRoomUrl: EE_CONTROL_ROOM_URL,
        },
        id: tokenAuthId,
        proxy: false,
        serviceId: CONTROL_ROOM_SERVICE_ID,
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
      }
    );

    // CE returns blank object
    expect(values).toStrictEqual({
      deploymentId: DEPLOYMENT_ID,
    });
  });

  it("runs public Enterprise Edition bot using token configuration", async () => {
    proxyServiceMock.mockResolvedValue({
      status: 201,
      statusText: "Created",
      data: {
        deploymentId: DEPLOYMENT_ID,
      },
      $$proxied: false,
    });

    getCachedAuthDataMock.mockResolvedValue({
      user: { id: CONTROL_ROOM_USER_ID },
      _oauthBrand: undefined,
    } as AuthData);

    const values = await brick.run(
      unsafeAssumeValidArg({
        service: {
          id: tokenAuthId,
          proxy: false,
          serviceId: CONTROL_ROOM_SERVICE_ID,
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
      { logger } as BlockOptions
    );

    expect(proxyServiceMock).toHaveBeenCalledWith(
      {
        config: {
          controlRoomUrl: EE_CONTROL_ROOM_URL,
        },
        id: tokenAuthId,
        proxy: false,
        serviceId: CONTROL_ROOM_SERVICE_ID,
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
      }
    );

    expect(values).toStrictEqual({
      deploymentId: DEPLOYMENT_ID,
    });
  });

  it("runs Enterprise Edition bot in attended mode", async () => {
    proxyServiceMock.mockResolvedValue({
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
          control_room_url: EE_CONTROL_ROOM_URL,
          control_room_user_id: CONTROL_ROOM_USER_ID,
        },
      ],
    });

    const values = await brick.run(
      unsafeAssumeValidArg({
        service: {
          id: tokenAuthId,
          proxy: false,
          serviceId: CONTROL_ROOM_OAUTH_SERVICE_ID,
          config: {
            controlRoomUrl: EE_CONTROL_ROOM_URL,
          },
        },
        workspaceType: "public",
        isAttended: true,
        fileId: FILE_ID,
        data: {},
      }),
      { logger } as BlockOptions
    );

    expect(proxyServiceMock).toHaveBeenCalledWith(
      {
        config: {
          controlRoomUrl: EE_CONTROL_ROOM_URL,
        },
        id: tokenAuthId,
        proxy: false,
        serviceId: CONTROL_ROOM_OAUTH_SERVICE_ID,
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
      }
    );

    expect(values).toStrictEqual({
      deploymentId: DEPLOYMENT_ID,
    });
  });

  it("awaits Enterprise Edition result", async () => {
    proxyServiceMock.mockImplementation(async (service, request) => {
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

      if (request.url.includes("activity")) {
        return {
          status: 200,
          statusText: "Success",
          data: {
            list: [
              {
                status: "COMPLETED",
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
            ],
          },
          $$proxied: false,
        };
      }
    });

    getCachedAuthDataMock.mockResolvedValue({
      user: { id: CONTROL_ROOM_USER_ID },
      _oauthBrand: undefined,
    } as AuthData);

    const values = await brick.run(
      unsafeAssumeValidArg({
        service: {
          id: tokenAuthId,
          proxy: false,
          serviceId: CONTROL_ROOM_SERVICE_ID,
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
      { logger } as BlockOptions
    );

    expect(proxyServiceMock).toHaveBeenCalledWith(
      {
        config: {
          controlRoomUrl: EE_CONTROL_ROOM_URL,
        },
        id: tokenAuthId,
        proxy: false,
        serviceId: CONTROL_ROOM_SERVICE_ID,
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
      }
    );

    expect(values).toStrictEqual({
      foo: "bar",
    });
  });
});
