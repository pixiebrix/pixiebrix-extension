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

import { type Schema } from "@/types/schemaTypes";

export const BASE_SHEET_SCHEMA: Schema = {
  $ref: "https://app.pixiebrix.com/schemas/googleSheetId#",
};

export const SHEET_SERVICE_SCHEMA: Schema = {
  $ref: "https://app.pixiebrix.com/schemas/services/google/sheet",
  title: "Google Sheet",
  description:
    "Select a Google Sheet. The first row in your sheet MUST contain headings.",
};
