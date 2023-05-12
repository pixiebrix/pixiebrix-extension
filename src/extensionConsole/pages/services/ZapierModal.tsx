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

// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Button, Modal, Form, InputGroup } from "react-bootstrap";
import React, { useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy } from "@fortawesome/free-solid-svg-icons";
import notify from "@/utils/notify";
import { reportEvent } from "@/telemetry/events";
import { writeTextToClipboard } from "@/utils/clipboardUtils";
import { useGetZapierKeyQuery } from "@/services/api";

interface OwnProps {
  onClose: () => void;
}

const ZapierModal: React.FunctionComponent<OwnProps> = ({ onClose }) => {
  const { data } = useGetZapierKeyQuery();

  const handleCopy = useCallback(async () => {
    await writeTextToClipboard(String(data?.api_key));
    notify.success("Copied API Key to clipboard");
    reportEvent("ZapierKeyCopy");
  }, [data?.api_key]);

  return (
    <Modal show onHide={onClose} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Zapier</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Use this key to log in to PixieBrix from Zapier</p>
        <Form.Group>
          <Form.Group controlId="label">
            <Form.Label>PixieBrix API Key</Form.Label>
            <InputGroup>
              <Form.Control type="text" readOnly defaultValue={data?.api_key} />
              <InputGroup.Append>
                <Button variant="info" onClick={handleCopy}>
                  <FontAwesomeIcon icon={faCopy} />
                </Button>
              </InputGroup.Append>
            </InputGroup>
          </Form.Group>
        </Form.Group>
      </Modal.Body>
    </Modal>
  );
};

export default ZapierModal;
