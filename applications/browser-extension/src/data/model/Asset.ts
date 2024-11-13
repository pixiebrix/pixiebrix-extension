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

import { type UUID } from "@/types/stringTypes";
import { validateUUID } from "@/types/helpers";
import { type components } from "@/types/swagger";

export type Asset = {
  id: UUID;
  downloadUrl: URL;
  filename: string;
  isUploaded: boolean;
  updatedAt: Date;
  createdAt: Date;
};

export type AssetPreUpload = {
  asset: Asset;
  uploadUrl: URL;
  fields: Record<string, string>;
};

export function transformAssetResponse(
  response: components["schemas"]["Asset"],
): Asset {
  return {
    id: validateUUID(response.id),
    // @ts-expect-error -- TODO: these don't seem to be actually optional, how have we dealt with this in the past?
    downloadUrl: new URL(response.download_url),
    // @ts-expect-error -- TODO: see above
    filename: response.filename,
    // @ts-expect-error -- TODO: see above
    isUploaded: response.is_uploaded,
    // @ts-expect-error -- TODO: see above
    updatedAt: new Date(response.updated_at),
    // @ts-expect-error -- TODO: see above
    createdAt: new Date(response.created_at),
  };
}

export function transformAssetPreUploadResponse(
  response: components["schemas"]["AssetPreUpload"],
): AssetPreUpload {
  return {
    asset: transformAssetResponse(response.asset),
    uploadUrl: new URL(response.upload_url),
    // @ts-expect-error -- the type of fields in swagger is wrong (TODO make a ticket for this)
    fields: response.fields as Record<string, string>,
  };
}
