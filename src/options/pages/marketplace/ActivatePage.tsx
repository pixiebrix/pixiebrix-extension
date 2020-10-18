import { PageTitle } from "@/layout/Page";
import { faStoreAlt } from "@fortawesome/free-solid-svg-icons";
import React from "react";
import { useParams } from "react-router";
import { useFetch } from "@/hooks/fetch";
import { RecipeDefinition } from "@/types/definitions";
import { Col, Row } from "react-bootstrap";
import { GridLoader } from "react-spinners";
import ActivateWizard from "@/options/pages/marketplace/ActivateWizard";

interface BlueprintResponse {
  config: RecipeDefinition;
}

const ActivatePage: React.FunctionComponent = () => {
  const { blueprintId } = useParams<{ blueprintId: string }>();
  const blueprint = useFetch<BlueprintResponse>(`/api/recipes/${blueprintId}`);

  return (
    <div>
      <PageTitle
        icon={faStoreAlt}
        title={
          blueprint
            ? `Activate: ${blueprint.config.metadata.name}`
            : "Activate Blueprint"
        }
      />
      <div className="pb-4">
        <p>Configure and activate a blueprint from the marketplace</p>
      </div>

      <Row>
        <Col xl={8} lg={10} md={12}>
          {blueprint ? (
            <ActivateWizard blueprint={blueprint.config} />
          ) : (
            <GridLoader />
          )}
        </Col>
      </Row>
    </div>
  );
};

export default ActivatePage;
