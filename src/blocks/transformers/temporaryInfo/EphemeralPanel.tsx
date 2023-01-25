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

import React, { useEffect } from "react";
import { useAsyncState } from "@/hooks/common";
import { Modal } from "react-bootstrap";
import {
  cancelTemporaryPanel,
  getPanelDefinition,
  resolveTemporaryPanel,
} from "@/contentScript/messenger/api";
import Loader from "@/components/Loader";
import { getErrorMessage } from "@/errors/errorHelpers";
import { type Target } from "@/types";
import { validateUUID } from "@/types/helpers";
import reportError from "@/telemetry/reportError";
import ErrorBoundary from "@/components/ErrorBoundary";
import PanelBody from "@/sidebar/PanelBody";

const ModalLayout: React.FC = ({ children }) => (
  // Don't use React Bootstrap's Modal because we want to customize the classes in the layout
  <div className="modal-content">{children}</div>
);

/**
 * @see DisplayTemporaryInfo
 */
const EphemeralPanel: React.FC = () => {
  const params = new URLSearchParams(location.search);
  const nonce = validateUUID(params.get("nonce"));
  const opener = JSON.parse(params.get("opener")) as Target;

  // The opener for a sidebar panel will be the sidebar frame, not the host panel frame. The sidebar only opens in the
  // top-level frame, so hard-code the top-level frameId
  const target = opener;

  const [entry, isLoading, error] = useAsyncState(
    async () => getPanelDefinition(target, nonce),
    [nonce]
  );

  // Report error once
  useEffect(() => {
    if (error) {
      // TODO: https://github.com/pixiebrix/pixiebrix-extension/issues/2769
      reportError(error);
    }
  }, [error]);

  if (isLoading) {
    return (
      <ModalLayout>
        <Loader />
      </ModalLayout>
    );
  }

  if (error) {
    return (
      <ModalLayout>
        <div>Panel Error</div>

        <div className="text-danger my-3">{getErrorMessage(error)}</div>

        <div>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              cancelTemporaryPanel(target, [nonce]);
            }}
          >
            Close
          </button>
        </div>
      </ModalLayout>
    );
  }

  return (
    <ModalLayout>
      <Modal.Header
        closeButton
        onHide={() => {
          cancelTemporaryPanel(target, [nonce]);
        }}
      >
        <Modal.Title>{entry.heading}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ErrorBoundary>
          <PanelBody
            isRootPanel={false}
            payload={entry.payload}
            context={{ extensionId: entry.extensionId }}
            onAction={(action) => {
              resolveTemporaryPanel(target, nonce, action);
            }}
          />
        </ErrorBoundary>
      </Modal.Body>
    </ModalLayout>
  );
};

export default EphemeralPanel;
