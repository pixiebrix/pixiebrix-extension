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

import React from "react";
import { InputValidationError, OutputValidationError } from "@/blocks/errors";
import {
  getErrorMessageWithCauses,
  selectSpecificError,
} from "@/errors/errorHelpers";
import { type ErrorObject } from "serialize-error";
import InputValidationErrorDetail from "./InputValidationErrorDetail";
import NetworkErrorDetail from "./NetworkErrorDetail";
import OutputValidationErrorDetail from "./OutputValidationErrorDetail";
import { ClientRequestError } from "@/errors/clientRequestErrors";
import { ProxiedRemoteServiceError } from "@/errors/businessErrors";
import RemoteApiErrorDetail from "@/components/errors/RemoteApiErrorDetail";

type ErrorDetails = {
  title: string;
  detailsElement: React.ReactElement;
};

export default function getErrorDetails(error: ErrorObject): ErrorDetails {
  const inputValidationError = selectSpecificError(error, InputValidationError);
  if (inputValidationError) {
    return {
      title: "Invalid inputs for block",
      detailsElement: (
        <InputValidationErrorDetail error={inputValidationError} />
      ),
    };
  }

  const outputValidationError = selectSpecificError(
    error,
    OutputValidationError
  );
  if (outputValidationError) {
    return {
      title: "Invalid output for block",
      detailsElement: (
        <OutputValidationErrorDetail error={outputValidationError} />
      ),
    };
  }

  const networkError = selectSpecificError(error, ClientRequestError);
  if (networkError?.cause) {
    return {
      title: networkError.message,
      detailsElement: <NetworkErrorDetail error={networkError.cause} />,
    };
  }

  const remoteApiError = selectSpecificError(error, ProxiedRemoteServiceError);
  if (remoteApiError.response) {
    return {
      title: remoteApiError.message,
      detailsElement: (
        <RemoteApiErrorDetail response={remoteApiError.response} />
      ),
    };
  }

  return {
    title: "Error",
    detailsElement: (
      <div>
        <span>{getErrorMessageWithCauses(error)}</span>
      </div>
    ),
  };
}
