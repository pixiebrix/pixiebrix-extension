/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRedo } from "@fortawesome/free-solid-svg-icons";
import { reportError } from "@/telemetry/logging";

interface State {
  hasError: boolean;
  errorMessage: string;
  stack: string;
}

class ErrorBoundary extends React.Component<{}, State> {
  constructor(props: {}) {
    super(props);
    this.state = { hasError: false, errorMessage: undefined, stack: undefined };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return {
      hasError: true,
      errorMessage: error.toString(),
      stack: error.stack,
    };
  }

  componentDidCatch(error: Error): void {
    reportError(error);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <>
          <h1>Something went wrong.</h1>
          <div>
            <p>{this.state.errorMessage}</p>
          </div>
          <div>
            <Button onClick={() => location.reload()}>
              <FontAwesomeIcon icon={faRedo} /> Reload the Page
            </Button>
          </div>
          <div className="mt-2">{this.state.stack}</div>
        </>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
