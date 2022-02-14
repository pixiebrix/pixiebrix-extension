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

import styles from "./ExtensionLogsModal.module.scss";

import { MessageContext } from "@/core";
import React from "react";
import { Modal } from "react-bootstrap";
import { useDispatch } from "react-redux";
import BrickLogs from "@/options/pages/brickEditor/BrickLogs";
import { installedPageSlice } from "./installedPageSlice";
import { ContextLogs } from "@/components/logViewer/Logs";

const ExtensionLogsModal: React.FC<{
  title: string;
  context: MessageContext;
}> = ({ title, context }) => {
  const dispatch = useDispatch();
  const onClose = () => {
    dispatch(installedPageSlice.actions.setLogsContext(null));
  };

  return (
    <Modal
      show
      onHide={onClose}
      className={styles.root}
      dialogClassName={styles.modalDialog}
      contentClassName={styles.modalContent}
    >
      <Modal.Header closeButton>
        <Modal.Title>{`Logs: ${title}`}</Modal.Title>
      </Modal.Header>
      <Modal.Body className={styles.body}>
        <ContextLogs messageContext={context}>
          <BrickLogs />
        </ContextLogs>
      </Modal.Body>
    </Modal>
  );
};

export default ExtensionLogsModal;
