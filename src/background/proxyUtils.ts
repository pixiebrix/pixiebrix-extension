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

import { AxiosResponse } from "axios";
import { ProxyResponseData, ProxyResponseErrorData } from "@/types/contract";
import { getReasonPhrase } from "http-status-codes";

export function proxyResponseToAxiosResponse(
  data: ProxyResponseData
): Pick<AxiosResponse, "data" | "status" | "statusText"> {
  if (isProxiedErrorResponse(data)) {
    return {
      data: data.json,
      status: data.status_code,
      statusText: data.reason ?? data.message,
    };
  }

  return {
    data: data.json,
    status: data.status_code,
    // A bit of a hack, since our proxy doesn't return statusText on success
    statusText: getReasonPhrase(data.status_code),
  };
}

export function isProxiedErrorResponse(
  data: ProxyResponseData
): data is ProxyResponseErrorData {
  return data.status_code >= 400;
}
