import React from "react";
import { IBrick } from "@/core";
import { MarketplaceListing } from "@/types/contract";
import { Button, Col, Row } from "react-bootstrap";
import BrickIcon from "@/components/BrickIcon";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import SchemaTree from "@/components/schemaTree/SchemaTree";

const BrickDetail: React.FunctionComponent<{
  brick: IBrick;
  listing?: MarketplaceListing;
  onSelect: () => void;
  selectCaption: React.ReactNode;
}> = ({ brick, selectCaption = "Select", listing, onSelect }) => (
  <Row>
    <Col xs={12} className="d-flex justify-content-between mb-3">
      <div>
        <h4>
          {brick.name} <BrickIcon brick={brick} />
        </h4>
        <code>{brick.id}</code>
        <p>{brick.description}</p>
        {listing && (
          <a
            href={`https://pixiebrix.com/marketplace/${listing.id}`}
            className="text-info mr-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} className="mr-1" />
            View in Marketplace
          </a>
        )}
      </div>
      <div>
        <Button variant="primary mr-1 text-nowrap" size="lg" onClick={onSelect}>
          {selectCaption}
        </Button>
      </div>
    </Col>

    {"inputSchema" in brick && (
      <Col xs={12} className="small mb-3">
        <h6 className="my-3">Input Schema</h6>
        <SchemaTree schema={brick.inputSchema} />
      </Col>
    )}
    {"outputSchema" in brick && (
      <Col xs={12} className="small mb-3">
        <h6 className="my-3">Output Schema</h6>
        <SchemaTree schema={brick.outputSchema} />
      </Col>
    )}
    {"schema" in brick && (
      <Col xs={12} className="small mb-3">
        <h6 className="my-3">Schema</h6>
        <SchemaTree schema={brick.schema} />
      </Col>
    )}
  </Row>
);

export default BrickDetail;
