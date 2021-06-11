/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { PageTitle } from "@/layout/Page";
import {
  faClipboardCheck,
  faStoreAlt,
} from "@fortawesome/free-solid-svg-icons";
import React, { useMemo } from "react";
import { useParams } from "react-router";
import { useFetch } from "@/hooks/fetch";
import { RecipeDefinition } from "@/types/definitions";
import { Card, Col, Row } from "react-bootstrap";
import GridLoader from "react-spinners/GridLoader";
import ActivateWizard from "@/options/pages/marketplace/ActivateWizard";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export interface BlueprintResponse {
  config: RecipeDefinition;
}

const TEMPLATES_PAGE_PART = "templates";

const TemplateHeader: React.FunctionComponent<{
  blueprint: BlueprintResponse;
}> = ({ blueprint }) => {
  return (
    <>
      <PageTitle
        icon={faClipboardCheck}
        title={
          blueprint
            ? `Activate: ${blueprint.config.metadata.name}`
            : "Activate Blueprint"
        }
      />
      <div className="pb-4">
        <p>Configure and activate a pre-made template</p>
      </div>
    </>
  );
};

const MarketplaceHeader: React.FunctionComponent<{
  blueprint: BlueprintResponse;
}> = ({ blueprint }) => {
  return (
    <>
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
    </>
  );
};

const ActivatePage: React.FunctionComponent = () => {
  const { blueprintId, sourcePage } = useParams<{
    blueprintId: string;
    sourcePage: string;
  }>();
  const blueprint = useFetch<BlueprintResponse>(`/api/recipes/${blueprintId}`);

  const body = useMemo(() => {
    if (blueprint?.config?.extensionPoints != null) {
      return <ActivateWizard blueprint={blueprint.config} />;
    } else if (blueprint != null) {
      return (
        <Card>
          <Card.Header>Invalid Blueprint</Card.Header>
          <Card.Body>
            <p className="text-danger">
              Error: {decodeURIComponent(blueprintId)} is not a blueprint.
              Please verify the link you received to activate the blueprint
            </p>

            {sourcePage === TEMPLATES_PAGE_PART ? (
              <Link to={"/templates"} className="btn btn-info">
                <FontAwesomeIcon icon={faClipboardCheck} /> Go to Templates
              </Link>
            ) : (
              <Link to={"/marketplace"} className="btn btn-info">
                <FontAwesomeIcon icon={faStoreAlt} /> Go to Marketplace
              </Link>
            )}
          </Card.Body>
        </Card>
      );
    } else {
      return <GridLoader />;
    }
  }, [blueprintId, blueprint, sourcePage]);

  return (
    <div>
      {sourcePage === TEMPLATES_PAGE_PART ? (
        <TemplateHeader blueprint={blueprint} />
      ) : (
        <MarketplaceHeader blueprint={blueprint} />
      )}
      <Row>
        <Col xl={8} lg={10} md={12}>
          <ErrorBoundary>{body}</ErrorBoundary>
        </Col>
      </Row>
    </div>
  );
};

export default ActivatePage;
