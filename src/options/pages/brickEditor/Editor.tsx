/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Card, Nav } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faEyeSlash,
  faGlobe,
  faTimesCircle,
} from "@fortawesome/free-solid-svg-icons";
import React, { useEffect, useRef, useState } from "react";
import { useFormikContext } from "formik";
import CodeEditor from "./CodeEditor";
import SharingTable from "./Sharing";
import BrickLogs from "@/options/pages/brickEditor/BrickLogs";
import { MessageContext } from "@/core";

const SharingIcon: React.FunctionComponent<{
  isPublic: boolean;
  organizations: boolean;
}> = ({ isPublic, organizations }) => {
  if (isPublic) {
    return <FontAwesomeIcon icon={faGlobe} />;
  } else if (organizations) {
    return <FontAwesomeIcon icon={faBuilding} />;
  } else {
    return <FontAwesomeIcon icon={faEyeSlash} />;
  }
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

const Editor: React.FunctionComponent<OwnProps> = ({
  showTemplates,
  showLogs = true,
  logContext,
}) => {
  const [activeTab, setTab] = useState("edit");
  const [editorWidth, setEditorWidth] = useState();
  const { errors, values } = useFormikContext<EditorValues>();

  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current) {
      setEditorWidth(editorRef.current.offsetWidth);
    }
  }, [editorRef]);

  return (
    <Card ref={editorRef}>
      <Card.Header>
        <Nav variant="tabs" defaultActiveKey={activeTab} onSelect={setTab}>
          <Nav.Link eventKey="edit">
            {errors.config ? (
              <span className="text-danger">
                Editor <FontAwesomeIcon icon={faTimesCircle} />
              </span>
            ) : (
              "Editor"
            )}
          </Nav.Link>
          <Nav.Link eventKey="share">
            Sharing{" "}
            <SharingIcon
              isPublic={values.public}
              organizations={!!values.organizations.length}
            />
          </Nav.Link>
          {showLogs && <Nav.Link eventKey="logs">Logs</Nav.Link>}
        </Nav>
      </Card.Header>

      {activeTab === "edit" && (
        <CodeEditor
          name="config"
          width={editorWidth}
          showTemplates={showTemplates}
        />
      )}

      {activeTab === "share" && <SharingTable />}

      {activeTab === "logs" &&
        (logContext ? (
          <BrickLogs context={logContext} />
        ) : (
          <div className="p-4">Cannot determine log context for brick</div>
        ))}
    </Card>
  );
};

export default Editor;
