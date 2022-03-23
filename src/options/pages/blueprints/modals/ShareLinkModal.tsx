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

import React from "react";
import { Button, Form, InputGroup, Modal } from "react-bootstrap";
import copy from "copy-to-clipboard";
import notify from "@/utils/notify";
import { useDispatch } from "react-redux";
import { faCopy } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { RegistryId } from "@/core";
import { blueprintModalsSlice } from "@/options/pages/blueprints/modals/blueprintModalsSlice";

const ShareLinkModal: React.FunctionComponent<{
  blueprintId: RegistryId;
}> = ({ blueprintId }) => {
  const dispatch = useDispatch();
  const hideModal = () => {
    dispatch(blueprintModalsSlice.actions.setShareContext(null));
  };

  const installationLink = `https://app.pixiebrix.com/activate?id=${blueprintId}`;

  return (
    <Modal show onHide={hideModal}>
      <Modal.Header closeButton>
        <Modal.Title>Share Activation Link</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form.Group>
          <Form.Label className="pb-2">
            Click to copy the activation link to the clipboard
          </Form.Label>
          <InputGroup>
            <Form.Control
              type="text"
              readOnly
              defaultValue={installationLink}
            />
            <InputGroup.Append>
              <Button
                variant="info"
                onClick={() => {
                  copy(installationLink);
                  // Don't close the modal - that allows the user to re-copy the link and verify the link works
                  notify.success("Copied activation link to clipboard");
                }}
              >
                <FontAwesomeIcon icon={faCopy} />
              </Button>
            </InputGroup.Append>
          </InputGroup>
        </Form.Group>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="link" onClick={hideModal}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ShareLinkModal;
