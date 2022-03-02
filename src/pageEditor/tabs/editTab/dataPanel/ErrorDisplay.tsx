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
import React from "react";
import { ErrorObject } from "serialize-error";

type ErrorDisplayProps = {
  error: ErrorObject;
};

const ErrorDisplay: React.VoidFunctionComponent<ErrorDisplayProps> = ({
  error,
}) => {
  console.log("Got an error", error);
  const { name, message, stack, ...rest } = error;

  let title = "";
  let text = "";

  if (typeof name === "string") {
    switch (name) {
      case "InputValidationError":
        title = message;
        text = (rest as any)?.errors[0]?.error;
        break;
      case "ClientNetworkError":
        title = "Network Error";
        text = message;
        break;
      default:
        title = name;
        if (typeof message === "string") {
          text = message;
        }
    }
  }

  return typeof title === "string" ? (
    <div>
      <p>Error</p>
      <p className="text-danger">{title}</p>
      <p>
        Message: <br />
        {text}
      </p>
    </div>
  ) : (
    <JsonTree label="Error" data={error} />
  );
};

export default ErrorDisplay;
