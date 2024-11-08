/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import { isEmpty } from "lodash";
import { faRedo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Alert, Button } from "react-bootstrap";
import ErrorBoundary from "../components/ErrorBoundary";

class SidebarErrorBoundary extends ErrorBoundary {
  async reloadSidebar() {
    location.reload();
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-3">
          <Alert variant="danger">
            <Alert.Heading>Something went wrong</Alert.Heading>
            {!isEmpty(this.state.errorMessage) && (
              <p>{this.state.errorMessage}</p>
            )}

            <div>
              <Button variant="light" onClick={this.reloadSidebar}>
                <FontAwesomeIcon icon={faRedo} /> Reload Sidebar
              </Button>
            </div>
          </Alert>

          {this.state.stack && (
            <pre className="mt-2 small text-secondary">
              {this.state.stack
                // In the app
                .replaceAll(location.origin + "/", "")
                // In the content script
                .replaceAll(
                  `chrome-extension://${process.env.CHROME_EXTENSION_ID}/`,
                  "",
                )}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default SidebarErrorBoundary;
