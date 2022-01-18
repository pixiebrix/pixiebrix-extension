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
import { Button, Modal } from "react-bootstrap";
import { push } from "connected-react-router";
import { useParams } from "react-router-dom";
import copy from "copy-to-clipboard";
import useNotifications from "@/hooks/useNotifications";
import { useDispatch } from "react-redux";

const ShareLinkModal = () => {
  const dispatch = useDispatch();
  const hideModal = () => {
    dispatch(push("/installed"));
  };

  const { blueprintId } = useParams<{ blueprintId: string }>();

  const installationLink = `https://app.pixiebrix.com/activate?id=${blueprintId}`;

  const notify = useNotifications();
  const copyLink = () => {
    copy(installationLink);
    notify.success("Link copied to clipboard");
    hideModal();
  };

  return (
    <Modal show onHide={hideModal}>
      <Modal.Header>
        <Modal.Title>Copy the installation link to share</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <a href={installationLink}>{installationLink}</a>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="link" onClick={hideModal}>
          Close
        </Button>
        <Button onClick={copyLink}>Copy</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ShareLinkModal;
