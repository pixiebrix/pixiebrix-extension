import React from "react";
import { type Brick } from "@/types/brickTypes";
import { type MarketplaceListing } from "@/types/contract";
import { Button } from "react-bootstrap";
import BrickIcon from "@/components/BrickIcon";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import SchemaTree from "@/components/schemaTree/SchemaTree";

import { MARKETPLACE_URL } from "@/urlConstants";

const BlockDetail: React.FunctionComponent<{
  block: Brick;
  listing?: MarketplaceListing;
  onSelect: () => void;
  selectCaption: React.ReactNode;
}> = ({ block, selectCaption = "Select", listing, onSelect }) => (
  <div className="d-flex flex-column gap-3">
    <div className="d-flex justify-content-between">
      <div>
        <h4>
          {block.name} <BrickIcon brick={block} />
        </h4>
        <code>{block.id}</code>
        <p>{block.description}</p>
        {listing && (
          <a
            href={`${MARKETPLACE_URL}${listing.id}/`}
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
    </div>

    <div className="small">
      <h6 className="my-3">Input Schema</h6>
      <SchemaTree schema={block.inputSchema} />
    </div>

    {block.outputSchema && (
      <div className="small">
        <h6 className="my-3">Output Schema</h6>
        <SchemaTree schema={block.outputSchema} />
      </div>
    )}
  </div>
);

export default BlockDetail;
