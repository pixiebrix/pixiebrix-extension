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

import { getErrorMessage } from "@/errors";
import React from "react";
import { Button } from "react-bootstrap";
import Centered from "./editor/components/Centered";

type ErrorProps = {
  authError: unknown;
  error: string;
};

const Error: React.VoidFunctionComponent<ErrorProps> = ({
  authError,
  error,
}) => {
  const errorMessage = (authError && getErrorMessage(authError)) || error;

  return (
    <Centered vertically>
      {authError && (
        <div className="PaneTitle">Error authenticating account</div>
      )}
      <div>{errorMessage}</div>
      <div className="mt-2">
        <Button
          onClick={() => {
            void browser.tabs.reload(browser.devtools.inspectedWindow.tabId);
          }}
        >
          Reload Page
        </Button>
      </div>
      <div className="mt-2">
        <Button
          size="sm"
          variant="light"
          onClick={() => {
            location.reload();
          }}
        >
          Reload Editor
        </Button>
      </div>
    </Centered>
  );
};

export default Error;
