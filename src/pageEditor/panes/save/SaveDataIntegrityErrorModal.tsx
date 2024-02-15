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

import React, { useCallback, useMemo } from "react";
import { Button, Modal } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { selectEditorModalVisibilities } from "@/pageEditor/slices/editorSelectors";
import { actions } from "@/pageEditor/slices/editorSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { selectExtensions } from "@/store/extensionsSelectors";
import { type EditorRootState } from "@/pageEditor/pageEditorTypes";
import JSZip from "jszip";

const DataDumpButton: React.FC = () => {
  const activatedModComponents = useSelector(selectExtensions);
  const currentEditorState = useSelector(
    (state: EditorRootState) => state.editor,
  );

  const data = useMemo(
    () => ({
      activatedModComponents,
      currentEditorState,
    }),
    [activatedModComponents, currentEditorState],
  );

  const onClickDownload = useCallback(async () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const zip = new JSZip();
    const fileNameWithoutExtension = `pixiebrix_error_dump_${Date.now()}`;
    zip.file(`${fileNameWithoutExtension}.json`, blob);
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileNameWithoutExtension}.zip`;
    document.body.append(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }, [data]);

  return (
    <Button variant="primary" onClick={onClickDownload}>
      Download Data Dump <FontAwesomeIcon icon={faDownload} />
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
    <Modal show={show} onBackdropClick={() => {}}>
      <Modal.Header>
        <Modal.Title>Save Data Integrity Error</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          There was an error saving your changes, data corruption was detected.
          We need to clear changes in the page editor to prevent further
          corruption. Please use the button below to download a snapshot of the
          (corrupted) data from the page editor. If you contact PixieBrix
          support and send along this data dump, we may be able to help you
          recover your work.
        </p>
      </Modal.Body>
      <Modal.Footer>
        {show && (
          // Don't load the data dump if the modal is not visible
          <DataDumpButton />
        )}
        <Button variant="outline-primary" onClick={hideModal}>
          Ok
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SaveDataIntegrityErrorModal;
