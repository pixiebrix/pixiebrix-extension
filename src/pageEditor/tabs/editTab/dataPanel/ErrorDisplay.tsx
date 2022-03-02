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

import JsonTree from "@/components/jsonTree/JsonTree";
import { getRootCause, isAxiosError } from "@/errors";
import React from "react";
import { ErrorObject } from "serialize-error";
import { InputValidationError, OutputValidationError } from "@/blocks/errors";
import InputValidationErrorDetail from "@/components/logViewer/details/InputValidationErrorDetail";
import OutputValidationErrorDetail from "@/components/logViewer/details/OutputValidationErrorDetail";
import { Col, Container, Row } from "react-bootstrap";
import NetworkErrorDetail from "@/components/logViewer/details/NetworkErrorDetail";
import { AxiosError } from "axios";

type ErrorDisplayProps = {
  error: ErrorObject;
};

const ErrorDisplay: React.VoidFunctionComponent<ErrorDisplayProps> = ({
  error,
}) => {
  const rootError = getRootCause(error);
  const { name, message, stack, ...rest } = rootError;

  let errorDetail;

  if (typeof name === "string") {
    switch (name) {
      case "InputValidationError":
        errorDetail = (
          <InputValidationErrorDetail
            error={rootError as unknown as InputValidationError}
          />
        );
        break;
      case "OutputValidationError":
        errorDetail = (
          <OutputValidationErrorDetail
            error={rootError as unknown as OutputValidationError}
          />
        );
        break;
      case "ClientNetworkError": {
        const networkError: AxiosError = isAxiosError(rootError.error)
          ? rootError.error
          : (rootError as unknown as AxiosError);
        errorDetail = (
          <>
            <Row>
              <Col>
                <p>Network error</p>
              </Col>
            </Row>
            <NetworkErrorDetail error={networkError} />
          </>
        );
        break;
      }

      default:
        errorDetail = (
          <>
            <Row>
              <Col>
                <p>Error</p>
                <p className="text-danger">{name}</p>
                <p>
                  Message: <br />
                  {message}
                </p>
              </Col>
            </Row>
          </>
        );
    }
  }

  return typeof errorDetail === "undefined" ? (
    // Not showing the stack trace on the UI
    <JsonTree label="Error" data={{ name, message, ...rest }} />
  ) : (
    <Container>{errorDetail}</Container>
  );
};

export default ErrorDisplay;
