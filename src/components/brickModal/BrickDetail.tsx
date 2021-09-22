import React from "react";
import { IBlock, IService } from "@/core";
import { MarketplaceListing } from "@/types/contract";
import { Button, Col, Row } from "react-bootstrap";
import BrickIcon from "@/components/BrickIcon";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt, faPlus } from "@fortawesome/free-solid-svg-icons";
import SchemaTree from "@/components/schemaTree/SchemaTree";
import "./BrickModal.scss";

const BrickDetail: React.FunctionComponent<{
  brick: IBlock | IService;
  listing?: MarketplaceListing;
  onSelect: () => void;
}> = ({ brick, listing, onSelect }) => (
  <Row>
    <Col xs={12} className="d-flex justify-content-between">
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
        <Button variant="primary mr-1 text-nowrap" onClick={onSelect}>
          <FontAwesomeIcon icon={faPlus} className="mr-1" />
          Add brick
        </Button>
      </div>
    </Col>

    {"inputSchema" in brick ? (
      <Col xs={12}>
        <h5 className="my-3">Input Schema</h5>
        <SchemaTree schema={brick.inputSchema} />
        <h5 className="my-3">Output Schema</h5>
        <SchemaTree schema={brick.outputSchema} />
      </Col>
    ) : (
      <Col xs={12}>
        <h5 className="my-3">Schema</h5>
        <SchemaTree schema={brick.schema} />
      </Col>
    )}
  </Row>
);

export default BrickDetail;
