import React from "react";
import { type MarketplaceListing } from "@/types/contract";
import { Button } from "react-bootstrap";
import BrickIcon from "@/components/BrickIcon";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import SchemaTree from "@/components/schemaTree/SchemaTree";
import { type PackageInstance } from "@/types/registryTypes";
import { MARKETPLACE_URL } from "@/urlConstants";

type BrickDetailProps<T extends PackageInstance> = {
  brick: T;
  listing?: MarketplaceListing;
  onSelect: () => void;
  selectCaption: React.ReactNode;
};

const BrickDetail = <T extends PackageInstance>({
  brick,
  selectCaption = "Select",
  listing,
  onSelect,
}: BrickDetailProps<T>) => (
  <div>
    <div className="d-flex justify-content-between mb-3">
      <div>
        <h4>
          {brick.name} <BrickIcon brick={brick} />
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
        <Button
          data-testid={`${brick.name} detail button`}
          variant="primary mr-1 text-nowrap"
          size="lg"
          onClick={onSelect}
        >
          {selectCaption}
        </Button>
      </div>
    </div>

    {"inputSchema" in brick && (
      <div className="small mb-3">
        <h6 className="my-3">Input Schema</h6>
        <SchemaTree schema={brick.inputSchema} />
      </div>
    )}
    {"outputSchema" in brick && (
      <div className="small mb-3">
        <h6 className="my-3">Output Schema</h6>
        <SchemaTree schema={brick.outputSchema} />
      </div>
    )}
    {"schema" in brick && (
      <div className="small mb-3">
        <h6 className="my-3">Schema</h6>
        <SchemaTree schema={brick.schema} />
      </div>
    )}
  </div>
);

export default BrickDetail;
