import Card from "react-bootstrap/Card";
import Nav from "react-bootstrap/Nav";
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
  public: boolean;
  config: string;
  organizations: string[];
}

interface OwnProps {
  showTemplates?: boolean;
}

const Editor: React.FunctionComponent<OwnProps> = ({ showTemplates }) => {
  const [activeTab, setTab] = useState("edit");
  const [editorWidth, setEditorWidth] = useState();
  const { errors, values } = useFormikContext() as { errors: any; values: any };

  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current) {
      setEditorWidth(editorRef.current.offsetWidth);
    }
  }, [editorRef]);

  return (
    <Card ref={editorRef}>
      <Card.Header>
        <Nav
          variant="tabs"
          defaultActiveKey={activeTab}
          onSelect={(x: string) => setTab(x)}
        >
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
    </Card>
  );
};

export default Editor;
