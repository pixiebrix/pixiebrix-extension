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

import { serializeError } from "serialize-error";
import {
  ClientRequestError,
  RemoteServiceError,
} from "@/errors/clientRequestErrors";
import axios, { AxiosError } from "axios";
import MockAdapter from "axios-mock-adapter";

const axiosMock = new MockAdapter(axios);

afterEach(() => {
  axiosMock.reset();
  axiosMock.resetHistory();
});

describe("RemoteServiceError", () => {
  it("records cause", () => {
    const cause = new AxiosError("The tubes are clogged");
    // `serializeError` uses the name/message/stack property to determine if it's errorLike
    // In practice, AxiosErrors actually have stacks: https://github.com/axios/axios/issues/2387
    cause.stack = "";
    const error = new RemoteServiceError(
      "You Must Construct Additional Pylons",
      { cause }
    );
    expect(serializeError(error, { useToJSON: false }).cause).toStrictEqual(
      serializeError(cause, { useToJSON: false })
    );
  });

  it("keeps request and response", async () => {
    axiosMock
      .onAny()
      .reply(400, { detail: "I'm sorry Dave, I'm afraid I can't do that" });

    let cause: AxiosError;

    try {
      await axios({
        url: "https://httpstat.us/400",
        method: "get",
      });
    } catch (error: unknown) {
      cause = error as AxiosError;
    }

    const error = new RemoteServiceError(
      "You Must Construct Additional Pylons",
      { cause }
    );

    const serialized = serializeError(error, { useToJSON: false });

    expect((serialized.cause as AxiosError).config).toBeTruthy();
    expect((serialized.cause as AxiosError).response).toBeTruthy();
  });
});

describe("ClientRequestError", () => {
  it("records cause", () => {
    const cause = new AxiosError("The tubes are clogged");
    cause.stack = "";
    // `serializeError` uses the name/message/stack property to determine if it's errorLike
    // In practice, AxiosErrors actually have stacks: https://github.com/axios/axios/issues/2387
    const error = new ClientRequestError(
      "You Must Construct Additional Pylons",
      { cause }
    );
    expect(serializeError(error, { useToJSON: false }).cause).toStrictEqual(
      serializeError(cause, { useToJSON: false })
    );
  });
});
