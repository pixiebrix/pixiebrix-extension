import React from "react";
import { type MarketplaceListing } from "@/types/contract";
import { Button } from "react-bootstrap";
import PackageIcon from "@/components/PackageIcon";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import SchemaTree from "@/components/schemaTree/SchemaTree";
import { type PackageInstance } from "@/types/registryTypes";
import { MARKETPLACE_URL } from "@/urlConstants";

type PackageDetailProps<Instance extends PackageInstance> = {
  packageInstance: Instance;
  listing?: MarketplaceListing;
  onSelect: () => void;
  selectCaption: React.ReactNode;
};

const PackageDetail = <Instance extends PackageInstance>({
  packageInstance,
  selectCaption = "Select",
  listing,
  onSelect,
}: PackageDetailProps<Instance>) => (
  <div>
    <div className="d-flex justify-content-between mb-3">
      <div>
        <h4>
          {packageInstance.name}{" "}
          <PackageIcon packageOrMetadata={packageInstance} />
        </h4>
        <code>{packageInstance.id}</code>
        <p>{packageInstance.description}</p>
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
          data-testid={`${packageInstance.name} detail button`}
          variant="primary mr-1 text-nowrap"
          size="lg"
          onClick={onSelect}
        >
          {selectCaption}
        </Button>
      </div>
    </div>

    {"inputSchema" in packageInstance && (
      <div className="small mb-3">
        <h6 className="my-3">Input Schema</h6>
        <SchemaTree schema={packageInstance.inputSchema} />
      </div>
    )}
    {"outputSchema" in packageInstance && (
      <div className="small mb-3">
        <h6 className="my-3">Output Schema</h6>
        <SchemaTree schema={packageInstance.outputSchema} />
      </div>
    )}
    {"schema" in packageInstance && (
      <div className="small mb-3">
        <h6 className="my-3">Schema</h6>
        <SchemaTree schema={packageInstance.schema} />
      </div>
    )}
  </div>
);

export default PackageDetail;
