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
import {
  getErrorMessageWithCauses,
  selectSpecificError,
} from "@/errors/errorHelpers";
import { ErrorObject } from "serialize-error";
import InputValidationErrorDetail from "./InputValidationErrorDetail";
import NetworkErrorDetail from "./NetworkErrorDetail";
import OutputValidationErrorDetail from "./OutputValidationErrorDetail";
import { Col, Row } from "react-bootstrap";
import { ClientRequestError } from "@/errors/clientRequestErrors";

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
  // TODO: https://github.com/pixiebrix/pixiebrix-extension/issues/3613
  if (networkError?.cause) {
    return {
      title: "Network error",
      detailsElement: <NetworkErrorDetail error={networkError.cause} />,
    };
  }

  return {
    title: "Error",
    detailsElement: (
      <Row>
        <Col>{getErrorMessageWithCauses(error)}</Col>
      </Row>
    ),
  };
}
