/* eslint-disable @typescript-eslint/no-redundant-type-constituents -- TODO: The rule is right, but is this used for documentation? */
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

export interface SheetMeta {
  id: string;
  name: string;
}

export interface Doc extends SheetMeta {
  serviceId: "spread" | string;
  mimeType: "application/vnd.google-apps.spreadsheet" | string;
}

export interface Data {
  action: string;
  docs: Doc[];
}
