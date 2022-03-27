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
import { PageEditorTabContext } from "@/pageEditor/context";
import { getErrorMessage } from "@/errors";
import { Button } from "react-bootstrap";
import { useGetMeQuery } from "@/services/api";
import { isClientErrorData } from "@/types/errorContract";

const ErrorBanner: React.VFC = () => {
  const context = useContext(PageEditorTabContext);
  const { error: accountError } = useGetMeQuery();

  // HACK: this logic is necessary because our RTK API base query currently returns an object with data/status instead
  // of an error-like object that getErrorMessage can extract an error message from
  const data: unknown = (accountError as any)?.data;
  const error = accountError
    ? `Authentication error: ${
        isClientErrorData(data) ? data.detail : getErrorMessage(accountError)
      }`
    : context.tabState.error;

  if (!error) {
    return null;
  }

  return (
    <div className="d-flex p-2 align-items-center alert-danger flex-align-center">
      <div className="flex-grow-1">{error}</div>
      <div>
        <Button
          className="ml-2"
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
