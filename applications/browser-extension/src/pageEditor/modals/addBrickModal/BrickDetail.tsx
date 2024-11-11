import React from "react";
import { type Brick } from "@/types/brickTypes";
import { type MarketplaceListing } from "@/types/contract";
import { Button } from "react-bootstrap";
import PackageIcon from "@/components/PackageIcon";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import SchemaTree from "@/components/schemaTree/SchemaTree";

import { MARKETPLACE_URL } from "@/urlConstants";

const BrickDetail: React.FunctionComponent<{
  brick: Brick;
  listing?: MarketplaceListing;
  onSelect: () => void;
  selectCaption: React.ReactNode;
}> = ({ brick, selectCaption = "Select", listing, onSelect }) => (
  <div className="d-flex flex-column gap-3 flex-grow-1">
    <div className="d-flex justify-content-between">
      <div>
        <h4>
          {brick.name} <PackageIcon packageOrMetadata={brick} />
        </h4>
        <code>{brick.id}</code>
        <p>{brick.description}</p>
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
      <SchemaTree schema={brick.inputSchema} />
    </div>

    {brick.outputSchema && (
      <div className="small">
        <h6 className="my-3">Output Schema</h6>
        <SchemaTree schema={brick.outputSchema} />
      </div>
    )}
  </div>
);

export default BrickDetail;
