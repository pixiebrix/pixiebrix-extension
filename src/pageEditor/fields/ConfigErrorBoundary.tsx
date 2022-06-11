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
import { getErrorMessage } from "@/errors/errorHelpers";
import reportError from "@/telemetry/reportError";
import { UnknownObject } from "@/types";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { isEmpty } from "lodash";

// eslint-disable-next-line prefer-destructuring -- process.env substitution
const DEBUG = process.env.DEBUG;

interface State {
  hasError: boolean;
  errorMessage: string;
  stack: string;
}

class ConfigErrorBoundary extends Component<UnknownObject, State> {
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
    reportError(error);
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="mb-3">
          <h3>Unable to edit configuration</h3>

          <div className="text-info">
            <FontAwesomeIcon icon={faInfoCircle} />
            &nbsp; This brick configuration appears to use some features that
            are not currently supported in the Page Editor. Please visit the
            Workshop to modify the configuration
          </div>

          {DEBUG && (
            <div>
              <h4 className="my-4">Debug-Mode Information</h4>
              {!isEmpty(this.state.errorMessage) && (
                <div className="text-danger">
                  <p>{this.state.errorMessage}</p>
                </div>
              )}
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
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ConfigErrorBoundary;
