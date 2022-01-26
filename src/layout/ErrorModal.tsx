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

import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useCallback, useMemo } from "react";
import { Button, Modal } from "react-bootstrap";
import { useHistory, useLocation } from "react-router";

// Hardcoded list of error messages to avoid using user-provided strings in the options page
const errorMessages = new Map([
  // Unknown reason
  ["ERR_BROWSER_ACTION_TOGGLE", "PixieBrix could not run on the page"],

  // Standard message for extensions being blocked by the browser
  [
    "ERR_BROWSER_ACTION_TOGGLE_WEBSTORE",
    "The extensions gallery cannot be scripted",
  ],
]);

const ErrorModal: React.FunctionComponent = () => {
  const history = useHistory();
  const location = useLocation();

  const message = useMemo(
    () => errorMessages.get(new URLSearchParams(location.search).get("error")),
    [location]
  );

  const handleClose = useCallback(() => {
    // This won't preserve url params upon modal close. For the time being
    // we assume that error modal will only be used at the extension root url
    history.replace(location.pathname);
  }, [history, location]);

  if (message) {
    return (
      <Modal show onHide={handleClose} animation={false}>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">
            <FontAwesomeIcon icon={faExclamationCircle} className="mr-1" />
            Error
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{message}</p>
        </Modal.Body>
        <Modal.Footer>
          {/* eslint-disable-next-line jsx-a11y/no-autofocus -- It's a modal, autofocus improves a11y */}
          <Button variant="primary" onClick={handleClose} autoFocus>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  return null;
};

export default ErrorModal;
