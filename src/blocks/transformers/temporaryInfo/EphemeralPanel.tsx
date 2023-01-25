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

import cx from "classnames";
import React, { useEffect } from "react";
import { useAsyncState } from "@/hooks/common";
import { Modal, Popover } from "react-bootstrap";
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

type Mode = "modal" | "popover";

const ModalLayout: React.FC<{ className?: string }> = ({
  className,
  children,
}) => (
  // Don't use React Bootstrap's Modal because we want to customize the classes in the layout
  <div className={cx("modal-content", className)}>{children}</div>
);

const PopoverLayout: React.FC<{ className?: string }> = ({
  className,
  children,
}) => (
  // Don't use React Bootstrap's Modal because we want to customize the classes in the layout
  // data-iframe-height is used by iframe-resizer
  <div className={cx("popover", className)} data-iframe-height="">
    {children}
  </div>
);

/**
 * @see DisplayTemporaryInfo
 */
const EphemeralPanel: React.FC = () => {
  const params = new URLSearchParams(location.search);
  const nonce = validateUUID(params.get("nonce"));
  const opener = JSON.parse(params.get("opener")) as Target;
  const mode = params.get("mode") as Mode;

  // The opener for a sidebar panel will be the sidebar frame, not the host panel frame. The sidebar only opens in the
  // top-level frame, so hard-code the top-level frameId
  const target = opener;

  const Layout = mode === "modal" ? ModalLayout : PopoverLayout;

  const [entry, isLoading, error] = useAsyncState(
    async () => getPanelDefinition(target, nonce),
    [nonce]
  );

  useEffect(() => {
    document.dispatchEvent(
      new CustomEvent("@@pixiebrix/PANEL_MOUNTED", { detail: nonce })
    );
  }, [nonce]);

  // Report error once
  useEffect(() => {
    if (error) {
      // TODO: https://github.com/pixiebrix/pixiebrix-extension/issues/2769
      reportError(error);
    }
  }, [error]);

  if (isLoading) {
    return (
      <Layout>
        <Loader />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
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
      </Layout>
    );
  }

  return (
    <Layout>
      {mode === "popover" ? (
        <Popover.Title>{entry.heading}</Popover.Title>
      ) : (
        <Modal.Header
          closeButton
          onHide={() => {
            cancelTemporaryPanel(target, [nonce]);
          }}
        >
          <Modal.Title>{entry.heading}</Modal.Title>
        </Modal.Header>
      )}
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
    </Layout>
  );
};

export default EphemeralPanel;
