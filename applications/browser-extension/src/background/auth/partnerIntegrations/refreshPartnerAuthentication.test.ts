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

import refreshPartnerAuthentication from "./refreshPartnerAuthentication";
import { type PartnerAuthData } from "@/auth/authTypes";
import { uuidSequence } from "../../../testUtils/factories/stringFactories";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { getPartnerAuthData, setPartnerAuthData } from "@/auth/authStorage";
import { setCachedAuthData } from "../authStorage";

const axiosMock = new MockAdapter(axios);

jest.mock("../../../auth/authStorage");

const getPartnerAuthDataMock = jest.mocked(getPartnerAuthData);
const setPartnerAuthDataMock = jest.mocked(setPartnerAuthData);

jest.mock("../authStorage");

const setCachedAuthDataMock = jest.mocked(setCachedAuthData);

describe("refreshPartnerAuthentication", () => {
  it("throws error when partnerAuthData is empty", async () => {
    await expect(refreshPartnerAuthentication()).rejects.toThrow(
      /No partner auth data found/,
    );
  });

  it("throws error when refreshToken is null", async () => {
    const partnerAuthData: PartnerAuthData = {
      authId: uuidSequence(1),
      token: "test_token",
      extraHeaders: {},
      refreshToken: null,
      refreshUrl: null,
      refreshParamPayload: null,
      refreshExtraHeaders: null,
    };
    getPartnerAuthDataMock.mockResolvedValue(partnerAuthData);
    await expect(refreshPartnerAuthentication()).rejects.toThrow(
      /No refresh token found for authId/,
    );
  });

  it("calls axios.post with correct request config", async () => {
    const partnerAuthData: PartnerAuthData = {
      authId: uuidSequence(2),
      token: "test_token",
      extraHeaders: {
        test_header_1: "foo",
        test_header_2: "bar",
      },
      refreshToken: "test_refresh_token",
      refreshUrl: "https://my.testrefreshurl.com",
      refreshParamPayload: {
        hosturl: "https://control-room.example.com",
        grant_type: "refresh_token",
        client_id: "1234556",
        refresh_token: "test_refresh_token",
      },
      refreshExtraHeaders: {
        refresh_header_1: "baz",
        refresh_header_2: "qux",
      },
    };
    getPartnerAuthDataMock.mockResolvedValue(partnerAuthData);
    axiosMock.onPost("https://my.testrefreshurl.com").reply(200, {
      token: "new_test_token",
    });
    await refreshPartnerAuthentication();
    expect(axiosMock.history.post).toBeArrayOfSize(1);
    const axiosRequestConfig = axiosMock.history.post[0];
    expect(axiosRequestConfig).toMatchObject({
      method: "post",
      url: "https://my.testrefreshurl.com",
      data: "hosturl=https%3A%2F%2Fcontrol-room.example.com&grant_type=refresh_token&client_id=1234556&refresh_token=test_refresh_token",
      headers: {
        refresh_header_1: "baz",
        refresh_header_2: "qux",
      },
    });
  });

  it("calls setCachedAuthData with correct data", async () => {
    const partnerAuthData: PartnerAuthData = {
      authId: uuidSequence(3),
      token: "test_token",
      extraHeaders: {},
      refreshToken: "test_refresh_token",
      refreshUrl: "https://my.testrefreshurl.com",
      refreshParamPayload: {
        hosturl: "https://control-room.example.com",
        grant_type: "refresh_token",
        client_id: "1234556",
        refresh_token: "test_refresh_token",
      },
      refreshExtraHeaders: {},
    };
    getPartnerAuthDataMock.mockResolvedValue(partnerAuthData);
    axiosMock.onPost("https://my.testrefreshurl.com").reply(200, {
      token: "new_test_token",
      other_auth_data_value: 123,
      foo: "bar",
    });
    await refreshPartnerAuthentication();
    expect(setCachedAuthDataMock).toHaveBeenCalledWith(partnerAuthData.authId, {
      token: "new_test_token",
      other_auth_data_value: 123,
      foo: "bar",
    });
  });

  it("calls setPartnerAuthData with correct parameters", async () => {
    const partnerAuthData: PartnerAuthData = {
      authId: uuidSequence(4),
      token: "test_token",
      extraHeaders: {},
      refreshToken: "test_refresh_token",
      refreshUrl: "https://my.testrefreshurl.com",
      refreshParamPayload: {
        hosturl: "https://control-room.example.com",
        grant_type: "refresh_token",
        client_id: "1234556",
        refresh_token: "test_refresh_token",
      },
      refreshExtraHeaders: {},
    };
    getPartnerAuthDataMock.mockResolvedValue(partnerAuthData);
    axiosMock.onPost("https://my.testrefreshurl.com").reply(200, {
      access_token: "new_test_token",
      refresh_token: "new_test_refresh_token",
      other_auth_data_value: 123,
      foo: "bar",
    });
    await refreshPartnerAuthentication();
    expect(setPartnerAuthDataMock).toHaveBeenCalledWith({
      ...partnerAuthData,
      token: "new_test_token",
      refreshToken: "new_test_refresh_token",
      refreshParamPayload: {
        hosturl: "https://control-room.example.com",
        grant_type: "refresh_token",
        client_id: "1234556",
        refresh_token: "new_test_refresh_token",
      },
    });
  });

  it("throws on authorization error on the refresh request", async () => {
    const partnerAuthData: PartnerAuthData = {
      authId: uuidSequence(5),
      token: "test_token",
      extraHeaders: {},
      refreshToken: "test_refresh_token",
      refreshUrl: "https://my.testrefreshurl.com",
      refreshParamPayload: null,
      refreshExtraHeaders: null,
    };
    getPartnerAuthDataMock.mockResolvedValue(partnerAuthData);
    axiosMock.onPost("https://my.testrefreshurl.com").reply(401, {
      error: "unauthorized",
    });
    await expect(refreshPartnerAuthentication()).rejects.toThrow(
      /Request failed with status code 401/,
    );
  });
});
