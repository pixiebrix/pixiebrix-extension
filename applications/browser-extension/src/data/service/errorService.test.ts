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

import {
  BusinessError,
  CancelError,
  RequestSupersededError,
} from "@/errors/businessErrors";
import {
  selectExtraContext,
  shouldIgnoreError,
} from "@/data/service/errorService";
import { serializeError } from "serialize-error";
import { InteractiveLoginRequiredError } from "@/errors/authErrors";

const EXPECTED_RUNTIME_ID = "abc123";
const expectedManifestValues = {
  version_name: "1.0.0",
  version: "1.0.0",
  manifest_version: "3",
};

describe("shouldIgnoreError", () => {
  it.each([CancelError, RequestSupersededError])(
    "should ignore: %s",
    (CustomError) => {
      expect(shouldIgnoreError(new CustomError())).toBeTrue();
      expect(
        shouldIgnoreError(serializeError(new CustomError() as any)),
      ).toBeTrue();
    },
  );

  it.each([BusinessError, Error, InteractiveLoginRequiredError])(
    "should not ignore: %s",
    (CustomError) => {
      expect(shouldIgnoreError(new CustomError("test message"))).toBeFalse();
      expect(
        shouldIgnoreError(
          serializeError(new CustomError("test message") as any),
        ),
      ).toBeFalse();
    },
  );
});

describe("selectExtraContext", () => {
  beforeEach(async () => {
    browser.runtime.id = EXPECTED_RUNTIME_ID;
    browser.runtime.getManifest = jest
      .fn()
      .mockReturnValue(expectedManifestValues);
  });

  it("should return the expected extension context", async () => {
    await expect(selectExtraContext(new Error("foo"))).resolves.toStrictEqual(
      expect.objectContaining({
        extensionVersion: expectedManifestValues.version,
        manifestVersion: expectedManifestValues.manifest_version,
        runtimeId: EXPECTED_RUNTIME_ID,
      }),
    );
  });
});
