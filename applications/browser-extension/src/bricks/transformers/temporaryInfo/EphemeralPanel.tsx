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

import cx from "classnames";
import React from "react";
import { Button, Modal, Popover } from "react-bootstrap";
import {
  cancelTemporaryPanel,
  resolveTemporaryPanel,
} from "@/contentScript/messenger/api";
import Loader from "@/components/Loader";
import { getErrorMessage } from "@/errors/errorHelpers";
import { type Target } from "@/types/messengerTypes";
import { validateUUID } from "@/types/helpers";
import ErrorBoundary from "@/components/ErrorBoundary";
import PanelBody from "@/sidebar/PanelBody";
import useTemporaryPanelDefinition from "@/bricks/transformers/temporaryInfo/useTemporaryPanelDefinition";
import { type UUID } from "@/types/stringTypes";
import { startCase } from "lodash";
import { type PanelButton } from "@/types/sidebarTypes";
import { ClosePanelAction } from "@/bricks/errors";
import styles from "./EphemeralPanel.module.scss";
import useReportError from "@/hooks/useReportError";
import { mapModComponentRefToMessageContext } from "@/utils/modUtils";
import { assertNotNullish } from "@/utils/nullishUtils";

type Mode = "modal" | "popover";

const ModalLayout: React.FC<
  React.PropsWithChildren<{ className?: string }>
> = ({ className, children }) => (
  // Don't use React Bootstrap's Modal because we want to customize the classes in the layout
  <div className={cx("modal-content", className)}>{children}</div>
);

const PopoverLayout: React.FC<
  React.PropsWithChildren<{ className?: string }>
> = ({ className, children }) => (
  // Don't use React Bootstrap's Modal because we want to customize the classes in the layout
  // data-iframe-height is used by iframe-resizer
  <div className={cx("popover", className)} data-iframe-height="">
    {children}
  </div>
);

const ActionToolbar: React.FC<{
  actions: PanelButton[];
  onClick: (action: PanelButton) => void;
}> = ({ actions, onClick }) => (
  <div className={styles.actionToolbar}>
    {actions.map((action, index) => (
      <Button
        key={action.caption ?? action.type ?? index}
        variant={action.variant}
        size="sm"
        onClick={() => {
          onClick(action);
        }}
      >
        {action.caption ?? startCase(action.type)}
      </Button>
    ))}
  </div>
);

/**
 * A modal or popover panel that displays temporary information.
 * @see displayTemporaryInfo
 */
const EphemeralPanel: React.FC = () => {
  const params = new URLSearchParams(location.search);
  const initialNonce: UUID | undefined = validateUUID(params.get("nonce"));
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- works if opener is null, but TS doesn't know that
  const opener = params.get("opener")!;
  const mode = params.get("mode") as Mode;

  // The opener for a sidebar panel will be the sidebar frame, not the host panel frame. The sidebar only opens in the
  // top-level frame, so hard-code the top-level frameId
  const target = JSON.parse(opener) as Target;

  const Layout = mode === "modal" ? ModalLayout : PopoverLayout;

  const { panelNonce, entry, isLoading, error } = useTemporaryPanelDefinition(
    target,
    initialNonce,
  );

  useReportError(error);

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
          <Button
            variant="primary"
            onClick={() => {
              assertNotNullish(
                panelNonce,
                "panelNonce is required to cancel temporary panel",
              );

              cancelTemporaryPanel(target, [panelNonce]);
            }}
          >
            Close
          </Button>
        </div>
      </Layout>
    );
  }

  // Panel was pre-allocated for performance
  if (entry == null) {
    if (mode === "popover") {
      return (
        <Layout>
          <Popover.Title></Popover.Title>
          <Popover.Content>&nbsp;</Popover.Content>
        </Layout>
      );
    }

    return (
      <Layout>
        <Modal.Header></Modal.Header>
        <Modal.Body></Modal.Body>
      </Layout>
    );
  }

  assertNotNullish(
    panelNonce,
    "panelNonce is required to replace reserved panel with a temporary panel",
  );

  if (mode === "popover") {
    return (
      <Layout>
        <Popover.Title>
          {entry.heading}
          {(entry.showCloseButton ?? true) && (
            <Button
              className="close"
              data-dismiss="alert"
              onClick={() => {
                cancelTemporaryPanel(
                  target,
                  [panelNonce],
                  new ClosePanelAction("User closed the panel"),
                );
              }}
            >
              &times;
            </Button>
          )}
        </Popover.Title>
        <Popover.Content>
          <ErrorBoundary>
            <PanelBody
              isRootPanel={false}
              payload={entry.payload}
              context={mapModComponentRefToMessageContext(
                entry.modComponentRef,
              )}
              onAction={(action) => {
                resolveTemporaryPanel(target, panelNonce, action);
              }}
            />
          </ErrorBoundary>

          {Number(entry.actions?.length) > 0 && (
            <>
              <hr className={styles.actionDivider} />
              <ActionToolbar
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length check above
                actions={entry.actions!}
                onClick={(action) => {
                  resolveTemporaryPanel(target, panelNonce, action);
                }}
              />
            </>
          )}
        </Popover.Content>
      </Layout>
    );
  }

  return (
    <Layout>
      <Modal.Header
        closeButton={entry.showCloseButton ?? true}
        onHide={() => {
          cancelTemporaryPanel(
            target,
            [panelNonce],
            new ClosePanelAction("User closed the panel"),
          );
        }}
      >
        <Modal.Title>{entry.heading}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ErrorBoundary>
          <PanelBody
            isRootPanel={false}
            payload={entry.payload}
            context={mapModComponentRefToMessageContext(entry.modComponentRef)}
            onAction={(action) => {
              resolveTemporaryPanel(target, panelNonce, action);
            }}
          />
        </ErrorBoundary>
      </Modal.Body>

      {Number(entry.actions?.length) > 0 && (
        <Modal.Footer>
          <ActionToolbar
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length check above
            actions={entry.actions!}
            onClick={(action) => {
              resolveTemporaryPanel(target, panelNonce, action);
            }}
          />
        </Modal.Footer>
      )}
    </Layout>
  );
};

export default EphemeralPanel;
