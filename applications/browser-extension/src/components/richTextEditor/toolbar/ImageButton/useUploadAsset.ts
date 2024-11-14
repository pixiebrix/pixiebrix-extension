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
  useCreateAssetPreUploadMutation,
  useUpdateAssetMutation,
} from "@/data/service/api";
import { type UUID } from "@/types/stringTypes";

import { createApi } from "@reduxjs/toolkit/query/react";
import { type BaseQueryFn } from "@reduxjs/toolkit/dist/query/baseQueryTypes";
import axios from "axios";
import { isAxiosError } from "@/errors/networkErrorHelpers";
import { serializeError } from "serialize-error";

interface PresignedUrlRequest {
  url: string;
  fields: Record<string, string>;
  file: File;
}

const presignedUrlBaseQuery: BaseQueryFn<PresignedUrlRequest, void> = async ({
  url,
  fields,
  file,
}) => {
  try {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      formData.append(key, value);
    }

    formData.append("file", file);

    const response = await axios.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return { data: response.data };
  } catch (error) {
    // Modeled after baseQuery.ts for PixieBrix API
    if (isAxiosError(error)) {
      error.name = "AxiosError";
      return {
        error: serializeError(error, { useToJSON: false }),
      };
    }

    return {
      error: serializeError(error),
    };
  }
};

export const s3UploadApi = createApi({
  reducerPath: "s3UploadApi",
  baseQuery: presignedUrlBaseQuery,
  endpoints: (builder) => ({
    uploadToS3: builder.mutation<void, PresignedUrlRequest>({
      query: (request) => request,
    }),
  }),
});

const useUploadAsset: () => (
  databaseId: UUID,
  file: File,
) => Promise<URL> = () => {
  const [createAssetPreUpload] = useCreateAssetPreUploadMutation();
  const [updateAsset] = useUpdateAssetMutation();
  const [uploadToS3] = s3UploadApi.useUploadToS3Mutation();

  return async (databaseId: UUID, file: File) => {
    const {
      asset: { id: assetId, downloadUrl },
      uploadUrl,
      fields,
    } = await createAssetPreUpload({
      databaseId,
      //filename: file.name,
    }).unwrap();

    await uploadToS3({
      url: uploadUrl.href,
      fields,
      file,
    }).unwrap();

    await updateAsset({
      databaseId,
      assetId,
      isUploaded: true,
    }).unwrap();

    return downloadUrl;
  };
};

export default useUploadAsset;
