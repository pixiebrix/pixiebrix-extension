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

import { cleanDatadogVersionName } from "@/telemetry/telemetryHelpers";
import { modComponentRefFactory } from "@/testUtils/factories/modComponentFactories";
import {
  mapMessageContextToModComponentRef,
  mapModComponentRefToMessageContext,
} from "@/utils/modUtils";

// Disable automatic __mocks__ resolution #6799
jest.mock("@/telemetry/telemetryHelpers", () =>
  jest.requireActual("./telemetryHelpers.ts"),
);

describe("cleanDatadogVersionName", () => {
  it("cleans local build version name", () => {
    expect(
      cleanDatadogVersionName("1.8.8-alpha.1-local+2024-01-14T18:13:07.744Z"),
    ).toBe("1.8.8-alpha.1-local");
  });

  it("cleans CI build name", () => {
    expect(cleanDatadogVersionName("1.8.8-alpha+293128")).toBe(
      "1.8.8-alpha_293128",
    );
  });
});

describe("mapModComponentRefToEventData", () => {
  it("maps fields", () => {
    const value = modComponentRefFactory();
    expect(mapModComponentRefToMessageContext(value)).toStrictEqual({
      modComponentId: value.extensionId,
      modId: value.blueprintId,
      starterBrickId: value.extensionPointId,
    });
  });

  it("replaces null with undefined", () => {
    const value = modComponentRefFactory({
      blueprintId: null,
    });
    expect(mapModComponentRefToMessageContext(value)).toStrictEqual({
      modComponentId: value.extensionId,
      modId: undefined,
      starterBrickId: value.extensionPointId,
    });
  });

  it("round trips mod component reference", () => {
    const value = modComponentRefFactory();
    expect(
      mapMessageContextToModComponentRef(
        mapModComponentRefToMessageContext(value),
      ),
    ).toStrictEqual(value);
  });
});
