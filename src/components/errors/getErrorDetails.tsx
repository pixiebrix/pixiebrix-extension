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

import React from "react";
import { InputValidationError, OutputValidationError } from "@/blocks/errors";
import { getRootCause, isAxiosError } from "@/errors";
import { AxiosError } from "axios";
import { Row, Col } from "react-bootstrap";
import { ErrorObject } from "serialize-error";
import InputValidationErrorDetail from "./InputValidationErrorDetail";
import NetworkErrorDetail from "./NetworkErrorDetail";
import OutputValidationErrorDetail from "./OutputValidationErrorDetail";

type ErrorDetails = {
  title: string;
  detailsElement: React.ReactNode;
};

const getErrorDetails: (error: ErrorObject) => ErrorDetails = (error) => {
  const rootError = getRootCause(error);
  const { name, message } = rootError;

  let errorDetails: ErrorDetails;

  switch (name) {
    case "InputValidationError":
      errorDetails = {
        title: "Invalid inputs for block",
        detailsElement: (
          <InputValidationErrorDetail
            error={rootError as unknown as InputValidationError}
          />
        ),
      };
      break;
    case "OutputValidationError":
      errorDetails = {
        title: "Invalid output for block",
        detailsElement: (
          <OutputValidationErrorDetail
            error={rootError as unknown as OutputValidationError}
          />
        ),
      };
      break;
    case "ClientNetworkError": {
      const networkError: AxiosError = isAxiosError(rootError.error)
        ? rootError.error
        : (rootError as unknown as AxiosError);
      errorDetails = {
        title: "Network error",
        detailsElement: <NetworkErrorDetail error={networkError} />,
      };
      break;
    }

    default:
      errorDetails = {
        title: "Error",
        detailsElement: (
          <p>
            Message: <br />
            {message}
          </p>
        ),
      };
  }

  return errorDetails;
};

export default getErrorDetails;
