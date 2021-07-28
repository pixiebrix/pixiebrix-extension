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

import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useMemo, useState } from "react";
import { Button, Modal, ModalBody } from "react-bootstrap";
import { useHistory, useLocation } from "react-router";

const errorMessages = new Map([
  [
    "ERR_BROWSER_ACTION_TOGGLE_SPECIAL_PAGE",
    "PixieBrix can’t run on internal browser pages",
  ],
  ["ERR_BROWSER_ACTION_TOGGLE", "PixieBrix could not run on the page"],
]);

const ErrorModal: React.FunctionComponent = () => {
  const [show, setShow] = useState(true);
  const history = useHistory();
  const location = useLocation();

  const message = useMemo(() => {
    console.log(location);
    return errorMessages.get(new URLSearchParams(location.search).get("error"));
  }, [location]);

  const handleClose = () => {
    setShow(false);
    // This won't preserve url params upon modal close. For the time being
    // we assume that error modal will only be used at the extension root url
    history.replace(location.pathname);
  };

  if (message) {
    return (
      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">
            <FontAwesomeIcon icon={faExclamationCircle} className="mr-1" />
            Error
          </Modal.Title>
        </Modal.Header>
        <ModalBody>
          <p>{message}</p>
        </ModalBody>
        <Modal.Footer>
          <Button variant="primary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  return null;
};

export default ErrorModal;
