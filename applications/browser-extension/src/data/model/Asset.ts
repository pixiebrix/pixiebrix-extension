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
  uploadUrl: string;
  fields: Record<string, string>;
};

export function transformAssetPreUploadResponse(
  response: components["schemas"]["AssetPreUpload"],
): AssetPreUpload {
  return {
    asset: {
      id: validateUUID(response.asset.id),
      downloadUrl: new URL(response.asset.download_url),
      filename: response.asset.filename,
      isUploaded: response.asset.is_uploaded,
      updatedAt: new Date(response.asset.updated_at),
      createdAt: new Date(response.asset.created_at),
    },
    uploadUrl: response.upload_url,
    // @ts-expect-error -- the type of fields in swagger is wrong (TODO make a ticket for this)
    fields: response.fields as Record<string, string>,
  };
}
