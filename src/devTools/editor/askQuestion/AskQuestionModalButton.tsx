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

import { faQuestionCircle } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { Button, Modal } from "react-bootstrap";

const AskQuestionModalButton: React.VoidFunctionComponent = () => {
  const [showModal, setShowModal] = React.useState(false);

  return (
    <>
      <Button
        size="sm"
        onClick={() => {
          setShowModal(true);
        }}
      >
        <FontAwesomeIcon icon={faQuestionCircle} /> Ask a question
      </Button>

      <Modal
        show={showModal}
        onHide={() => {
          setShowModal(false);
        }}
      >
        <Modal.Header closeButton>Ask a question</Modal.Header>
        <Modal.Body>Slack Forum Zoom</Modal.Body>
      </Modal>
    </>
  );
};

export default AskQuestionModalButton;
