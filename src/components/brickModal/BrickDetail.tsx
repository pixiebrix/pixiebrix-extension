import React from "react";
import { IBrick } from "@/core";
import { MarketplaceListing } from "@/types/contract";
import { Button, Col, Row } from "react-bootstrap";
import BrickIcon from "@/components/BrickIcon";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt, faPlus } from "@fortawesome/free-solid-svg-icons";
import SchemaTree from "@/components/schemaTree/SchemaTree";
import "./BrickModal.scss";

const BrickDetail: React.FunctionComponent<{
  brick: IBrick;
  listing?: MarketplaceListing;
  onSelect: () => void;
  selectCaption?: React.ReactNode;
}> = ({ brick, selectCaption = "Select", listing, onSelect }) => (
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
        <Button variant="primary mr-1 text-nowrap" size="lg" onClick={onSelect}>
          {selectCaption ? (
            selectCaption
          ) : (
            <>
              <FontAwesomeIcon icon={faPlus} className="mr-1" /> Add
            </>
          )}
        </Button>
      </div>
    </Col>

    <Col xs={12}>
      {"inputSchema" in brick && (
        <>
          <h5 className="my-3">Input Schema</h5>
          <SchemaTree schema={brick.inputSchema} />
        </>
      )}
      {"outputSchema" in brick && (
        <>
          <h5 className="my-3">Output Schema</h5>
          <SchemaTree schema={brick.outputSchema} />
        </>
      )}
      {"schema" in brick && (
        <>
          <h5 className="my-3">Schema</h5>
          <SchemaTree schema={brick.schema} />
        </>
      )}
    </Col>
  </Row>
);

export default BrickDetail;
