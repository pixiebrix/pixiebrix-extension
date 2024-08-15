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

import React, { useCallback } from "react";
import { Button, Modal } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { selectEditorModalVisibilities } from "@/pageEditor/store/editor/editorSelectors";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { selectActivatedModComponents } from "@/store/modComponents/modComponentSelectors";
import { type EditorRootState } from "@/pageEditor/store/editor/pageEditorTypes";
import JSZip from "jszip";
import download from "downloadjs";

const DiagnosticDataButton: React.FC = () => {
  const activatedModComponents = useSelector(selectActivatedModComponents);
  const currentEditorState = useSelector(
    (state: EditorRootState) => state.editor,
  );

  async function onClickDownload(): Promise<void> {
    const data = {
      activatedModComponents,
      currentEditorState,
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const zip = new JSZip();
    const fileNameWithoutExtension = `pixiebrix_diagnostic_data_${Date.now()}`;
    zip.file(`${fileNameWithoutExtension}.json`, blob);
    const content = await zip.generateAsync({ type: "blob" });
    download(content, `${fileNameWithoutExtension}.zip`, "application/zip");
  }

  return (
    <Button variant="primary" onClick={onClickDownload}>
      Download Diagnostic Data <FontAwesomeIcon icon={faDownload} />
    </Button>
  );
};

const SaveDataIntegrityErrorModal: React.FC = () => {
  const dispatch = useDispatch();
  const { isSaveDataIntegrityErrorModalVisible: show } = useSelector(
    selectEditorModalVisibilities,
  );

  const hideModal = useCallback(() => {
    dispatch(actions.resetEditor());
    dispatch(actions.hideModal());
  }, [dispatch]);

  return (
    // Disable the backdrop click handler to prevent the user from closing
    // the modal accidentally without downloading the diagnostic data
    <Modal show={show} onBackdropClick={() => {}}>
      <Modal.Header>
        <Modal.Title>Save Error</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          A data integrity error was detected, and PixieBrix must reset the Page
          Editor state. To recover your unsaved changes, click the Download
          Diagnostic Data button and email support@pixiebrix.com
        </p>
      </Modal.Body>
      <Modal.Footer>
        {show && (
          // Don't load the diagnostic data if the modal is not visible
          <DiagnosticDataButton />
        )}
        <Button variant="outline-primary" onClick={hideModal}>
          Reset Page Editor
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SaveDataIntegrityErrorModal;
