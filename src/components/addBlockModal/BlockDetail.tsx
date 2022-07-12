import React from "react";
import { IBlock } from "@/core";
import { MarketplaceListing } from "@/types/contract";
import { Button, Col, Row } from "react-bootstrap";
import BrickIcon from "@/components/BrickIcon";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import SchemaTree from "@/components/schemaTree/SchemaTree";

const BlockDetail: React.FunctionComponent<{
  block: IBlock;
  listing?: MarketplaceListing;
  onSelect: () => void;
  selectCaption: React.ReactNode;
}> = ({ block, selectCaption = "Select", listing, onSelect }) => (
  <Row className="w-100">
    <Col xs={12} className="d-flex justify-content-between mb-3">
      <div>
        <h4>
          {block.name} <BrickIcon brick={block} />
        </h4>
        <code>{block.id}</code>
        <p>{block.description}</p>
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

    <Col xs={12} className="small mb-3">
      <h6 className="my-3">Input Schema</h6>
      <SchemaTree schema={block.inputSchema} />
    </Col>

    {block.outputSchema && (
      <Col xs={12} className="small mb-3">
        <h6 className="my-3">Output Schema</h6>
        <SchemaTree schema={block.outputSchema} />
      </Col>
    )}
  </Row>
);

export default BlockDetail;
