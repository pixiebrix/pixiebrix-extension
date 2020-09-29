import React from "react";
import { PageTitle } from "@/designer/options/layout/Page";
import { faHammer } from "@fortawesome/free-solid-svg-icons";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import AsyncSelect from "react-select/async";
import {
  ExtensionPointOption,
  getExtensionPointOptions,
} from "@/extensionPoints/registry";
import { Link } from "react-router-dom";

interface OwnProps {
  navigate: (url: string) => void;
}

const ExtensionPointCreate: React.FunctionComponent<OwnProps> = ({
  navigate,
}) => {
  return (
    <div>
      <PageTitle icon={faHammer} title="Workshop" />
      <div className="pb-4">
        <p>
          Build a brick from scratch. To install pre-made brix, visit the{" "}
          <Link to={"/marketplace"}>Marketplace</Link>
        </p>
      </div>
      <Row>
        <Col md="12" lg="8">
          <Card>
            <Card.Header>Foundation</Card.Header>
            <Card.Body>
              <p>Choose a foundation where your brick will appear</p>

              <AsyncSelect
                defaultOptions
                placeholder="Select a foundation"
                loadOptions={getExtensionPointOptions}
                onChange={(option: ExtensionPointOption) =>
                  navigate(`/targets/${encodeURIComponent(option.value)}`)
                }
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ExtensionPointCreate;
