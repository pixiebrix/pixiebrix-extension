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

import { Card, Nav, Tab } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faEyeSlash,
  faGlobe,
  faSave,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFormikContext } from "formik";
import CodeEditor from "./CodeEditor";
import SharingTable from "./SharingTable";
import { sortBy } from "lodash";
import BrickLogs from "@/options/pages/brickEditor/BrickLogs";
import { MessageContext, UUID } from "@/core";
import BrickReference from "@/options/pages/brickEditor/referenceTab/BrickReference";
import { useAsyncState } from "@/hooks/common";
import serviceRegistry from "@/services/registry";
import blockRegistry from "@/blocks/registry";
import extensionPointRegistry from "@/extensionPoints/registry";
import { fetch } from "@/hooks/fetch";
import { Brick } from "@/types/contract";
import browser from "webextension-polyfill";
import ConfirmNavigationModal from "@/components/ConfirmNavigationModal";
import useNotifications from "@/hooks/useNotifications";
import { ReferenceEntry } from "./brickEditorTypes";
import BrickHistory from "@/options/pages/brickEditor/BrickHistory";
import { useParams } from "react-router";
import { isMac } from "@/utils";

const SharingIcon: React.FunctionComponent<{
  isPublic: boolean;
  organizations: boolean;
}> = ({ isPublic, organizations }) => {
  if (isPublic) {
    return <FontAwesomeIcon icon={faGlobe} />;
  }

  if (organizations) {
    return <FontAwesomeIcon icon={faBuilding} />;
  }

  return <FontAwesomeIcon icon={faEyeSlash} />;
};

export interface EditorValues {
  reactivate?: boolean;
  public: boolean;
  config: string;
  organizations: string[];
}

interface OwnProps {
  showTemplates?: boolean;
  showLogs?: boolean;
  logContext: MessageContext | null;
}

function useOpenEditorTab() {
  const notify = useNotifications();
  return useCallback(
    async (id: string) => {
      const available = await fetch<Brick[]>("/api/bricks/");
      const brick = available.find((x) => x.name === id);
      if (brick) {
        console.debug("Open editor for brick: %s", id, { brick });
        const url = browser.runtime.getURL("options.html");
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- we're constructing via server response
        window.open(`${url}#/workshop/bricks/${brick.id}`);
      } else {
        notify.warning(`You cannot edit brick: ${id}`);
      }
    },
    [notify]
  );
}

const Editor: React.FunctionComponent<OwnProps> = ({
  showLogs = true,
  logContext,
}) => {
  const notify = useNotifications();
  const [activeTab, setTab] = useState("edit");
  const [editorWidth, setEditorWidth] = useState();
  const [selectedReference, setSelectedReference] = useState<ReferenceEntry>();
  const { errors, values, dirty } = useFormikContext<EditorValues>();
  const { id: brickId } = useParams<{ id: UUID }>();

  const [bricks] = useAsyncState(async () => {
    const [extensionPoints, bricks, services] = await Promise.all([
      extensionPointRegistry.all(),
      blockRegistry.all(),
      serviceRegistry.all(),
    ]);
    return [...extensionPoints, ...bricks, ...services];
  }, []);

  const openReference = useCallback(
    (id: string) => {
      const brick = bricks?.find((x) => x.id === id);
      if (brick) {
        console.debug("Open reference for brick: %s", brick.id, { brick });
        setSelectedReference(brick);
        setTab("reference");
      } else {
        console.debug("Known bricks", {
          bricks: sortBy(bricks.map((x) => x.id)),
        });
        notify.warning(`Cannot find brick: ${id}`);
      }
    },
    [setTab, bricks, setSelectedReference, notify]
  );

  const openEditorTab = useOpenEditorTab();

  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current) {
      setEditorWidth(editorRef.current.offsetWidth);
    }
  }, [editorRef]);

  return (
    <div>
      <ConfirmNavigationModal />
      <div className="mb-3">
        <ul className="list-unstyled list-inline">
          <li className="list-inline-item">
            <kbd>{isMac() ? "Cmd" : "Ctrl"}</kbd> + <kbd>S</kbd>: Save
          </li>
          <li className="list-inline-item mx-3">
            <kbd>{isMac() ? "Cmd" : "Ctrl"}</kbd> + <kbd>B</kbd>: View Reference
          </li>
          <li className="list-inline-item mx-3">
            <kbd>{isMac() ? "Cmd" : "Ctrl"}</kbd> + <kbd>O</kbd>: Open Brick
          </li>
          <li className="list-inline-item mx-3">
            <kbd>{isMac() ? "Cmd" : "Ctrl"}</kbd> + <kbd>F</kbd>: Search
          </li>
        </ul>
      </div>
      <Card ref={editorRef}>
        <Tab.Container
          id="editor-container"
          defaultActiveKey={activeTab}
          activeKey={activeTab}
        >
          <Card.Header>
            <Nav variant="tabs" onSelect={setTab}>
              <Nav.Link eventKey="edit">
                {dirty ? (
                  <span className="text-danger">
                    Editor{" "}
                    <FontAwesomeIcon
                      icon={errors.config ? faTimesCircle : faSave}
                    />
                  </span>
                ) : (
                  "Editor"
                )}
              </Nav.Link>
              <Nav.Link eventKey="share">
                Sharing{" "}
                <SharingIcon
                  isPublic={values.public}
                  organizations={values.organizations.length > 0}
                />
              </Nav.Link>
              {showLogs && <Nav.Link eventKey="logs">Logs</Nav.Link>}
              <Nav.Link eventKey="reference">Reference</Nav.Link>
              <Nav.Link eventKey="history" disabled={!brickId}>
                History
              </Nav.Link>
            </Nav>
          </Card.Header>

          <Tab.Content className="p-0">
            <Tab.Pane eventKey="edit" className="p-0">
              <CodeEditor
                name="config"
                width={editorWidth}
                openDefinition={openReference}
                openEditor={openEditorTab}
              />
            </Tab.Pane>
            <Tab.Pane eventKey="share" className="p-0">
              <SharingTable />
            </Tab.Pane>

            {showLogs && (
              <Tab.Pane eventKey="logs" className="p-0">
                {logContext ? (
                  <BrickLogs context={logContext} />
                ) : (
                  <div className="p-4">
                    Cannot determine log context for brick
                  </div>
                )}
              </Tab.Pane>
            )}

            <Tab.Pane eventKey="reference" className="p-0">
              <BrickReference
                key={selectedReference?.id}
                bricks={bricks}
                initialSelected={selectedReference}
              />
            </Tab.Pane>

            <Tab.Pane eventKey="history" className="p-0">
              {brickId ? (
                <BrickHistory brickId={brickId} />
              ) : (
                // This should never be shown since we disable the tab when creating a new brick
                <div>Save the brick to view its version history</div>
              )}
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Card>
    </div>
  );
};

export default Editor;
