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

import React, { useContext } from "react";
import { DevToolsContext } from "@/devTools/context";
import { useGetAuthQuery } from "@/services/api";
import { getErrorMessage } from "@/errors";
import { Button } from "react-bootstrap";

const ErrorBanner: React.VFC = () => {
  const context = useContext(DevToolsContext);
  const { error: accountError } = useGetAuthQuery();

  const error = accountError
    ? "Authentication error: " + getErrorMessage(accountError)
    : context.tabState.error;

  if (!error) {
    return null;
  }

  return (
    <div className="d-flex p-1 align-items-center alert-danger flex-align-center">
      <div className="flex-grow-1">{error}</div>
      <div>
        <Button
          className="mr-2"
          onClick={() => {
            location.reload();
          }}
        >
          Reload Editor
        </Button>
      </div>
    </div>
  );
};

export default ErrorBanner;
