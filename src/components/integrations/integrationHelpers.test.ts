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
  convertInstanceLocationToFormikPath,
  convertSchemaErrorsToFormikErrors,
} from "@/components/integrations/integrationHelpers";
import { type OutputUnit } from "@cfworker/json-schema";

describe("integrationHelpers", () => {
  it.each([["#/config/folderId", "config.folderId"]])(
    "%s is converted to %s",
    (instanceLocation, formikPath) => {
      console.log({ instanceLocation, formikPath });
      expect(convertInstanceLocationToFormikPath(instanceLocation)).toBe(
        formikPath,
      );
    },
  );

  describe("convertSchemaErrorsToFormikErrors", () => {
    it("converts schema errors to formik errors", () => {
      const schemaErrors: OutputUnit[] = [
        {
          instanceLocation: "#",
          keyword: "properties",
          keywordLocation: "#/properties",
          error: 'Property "config" does not match schema.',
        },
        {
          instanceLocation: "#/config",
          keyword: "properties",
          keywordLocation: "#/properties/config/properties",
          error: 'Property "folderId" does not match schema.',
        },
        {
          instanceLocation: "#/config/folderId",
          keyword: "pattern",
          keywordLocation: "#/properties/config/properties/folderId/pattern",
          error: "String does not match pattern.",
        },
      ];

      expect(convertSchemaErrorsToFormikErrors(schemaErrors)).toStrictEqual({
        config: {
          folderId: "String does not match pattern.",
        },
      });
    });
  });
});
