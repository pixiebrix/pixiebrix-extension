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

import React, { Component } from "react";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRedo } from "@fortawesome/free-solid-svg-icons";
import { getErrorMessage } from "@/errors/errorHelpers";
import { type UnknownObject } from "@/types/objectTypes";
import { isEmpty } from "lodash";

interface DisplayProps {
  /**
   * Where the error happened, a hint in a free form
   */
  errorContext?: string;
}

interface BoundaryProps extends DisplayProps {
  /**
   * Custom error display component
   */
  ErrorComponent?: React.FC<DisplayProps & ErrorState>;
}

interface ErrorState {
  /**
   * True if there was an error. Will always be true in ErrorDisplayProps
   */
  hasError: boolean;
  /**
   * The error object
   */
  error: unknown;
  /**
   * The error message, if available.
   * @see getErrorMessage
   */
  errorMessage: string | null;
  /**
   * The error stack trace, if available.
   */
  stack: string | null;
}

/**
 * Props passed to the ErrorComponent in the ErrorBoundary
 * @see ErrorBoundary
 */
export type ErrorDisplayProps = DisplayProps & ErrorState;

/**
 * Default error display for use with ErrorBoundary
 * @constructor
 * @see ErrorBoundary
 */
export const DefaultErrorComponent: React.FC<ErrorDisplayProps> = ({
  errorContext,
  errorMessage,
  stack,
}) => (
  <div className="p-3">
    <h1>Something went wrong.</h1>
    {errorContext && <h2>{errorContext}</h2>}
    {!isEmpty(errorMessage) && (
      <div>
        <p>{errorMessage}</p>
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
    {stack && (
      <pre className="mt-2 small text-secondary">
        {stack
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

class ErrorBoundary extends Component<BoundaryProps, ErrorState> {
  constructor(props: UnknownObject) {
    super(props);
    this.state = {
      hasError: false,
      error: undefined,
      errorMessage: undefined,
      stack: undefined,
    };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return {
      hasError: true,
      error,
      errorMessage: getErrorMessage(error),
      stack: error.stack,
    };
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      const ErrorComponent = this.props.ErrorComponent ?? DefaultErrorComponent;

      return <ErrorComponent {...this.props} {...this.state} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
