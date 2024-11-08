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

import { type Schema } from "../../../../types/schemaTypes";
import { validateRegistryId } from "../../../../types/helpers";
import googleSheetIdSchema from "../../../../../schemas/googleSheetId.json";

export const SPREADSHEET_FIELD_TITLE = "Google Sheet";
export const SPREADSHEET_FIELD_DESCRIPTION =
  "Select a Google Sheet. The first row in your sheet MUST contain headings.";

/**
 * `$ref` schema for a Google Sheet input. In general, use SHEET_FIELD_SCHEMA directly instead.
 * @see SHEET_FIELD_SCHEMA
 * @internal
 */
export const SHEET_FIELD_REF_SCHEMA: Schema = {
  $ref: "https://app.pixiebrix.com/schemas/googleSheetId#",
  // XXX: provide base type in-case $ref cannot be dereferenced / or the field context is not $ref-aware.
  //  Why is including type necessary?
  type: "string",
};

/**
 * The actual schema for Google Sheet fields.
 * @see SHEET_FIELD_REF_SCHEMA
 */
export const SHEET_FIELD_SCHEMA: Schema = googleSheetIdSchema as Schema;

/**
 * Schema for the legacy/obsolete Google Sheet integration.
 * @deprecated use Google PKCE integration instead
 * @see GOOGLE_OAUTH2_PKCE_INTEGRATION_ID
 */
export const SHEET_INTEGRATION_SCHEMA: Schema = {
  $ref: "https://app.pixiebrix.com/schemas/services/google/sheet",
  title: SPREADSHEET_FIELD_TITLE,
  description: SPREADSHEET_FIELD_DESCRIPTION,
};

export const GOOGLE_OAUTH2_PKCE_INTEGRATION_ID =
  validateRegistryId("google/oauth2-pkce");
