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

import React, { Component } from "react";
import { Button } from "react-bootstrap";
import { isExtensionContext } from "webext-detect-page";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRedo } from "@fortawesome/free-solid-svg-icons";
import { getErrorMessage } from "@/errors/errorHelpers";
import reportError from "@/telemetry/reportError";
import { UnknownObject } from "@/types";
import { isEmpty } from "lodash";

interface Props {
  /**
   * Where the error happened, a hint in a free form
   */
  errorContext?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  stack: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: UnknownObject) {
    super(props);
    this.state = { hasError: false, errorMessage: undefined, stack: undefined };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return {
      hasError: true,
      errorMessage: getErrorMessage(error),
      stack: error.stack,
    };
  }

  override componentDidCatch(error: Error): void {
    if (isExtensionContext()) {
      reportError(error);
    }
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-3">
          <h1>Something went wrong.</h1>
          {this.props.errorContext && <h2>{this.props.errorContext}</h2>}
          {!isEmpty(this.state.errorMessage) && (
            <div>
              <p>{this.state.errorMessage}</p>
            </div>
          )}
          <div>
            <Button
              onClick={() => {
                location.reload();
              }}
            >
              <FontAwesomeIcon icon={faRedo} /> Reload the Page
            </Button>
          </div>
          {this.state.stack && (
            <pre className="mt-2 small text-secondary">
              {this.state.stack
                // In the app
                .replaceAll(location.origin + "/", "")
                // In the content script
                .replaceAll(
                  `chrome-extension://${process.env.CHROME_EXTENSION_ID}/`,
                  ""
                )}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
