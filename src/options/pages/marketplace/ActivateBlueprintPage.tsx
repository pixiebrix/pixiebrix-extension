/*
 * Copyright (C) 2021 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import Page from "@/layout/Page";
import { faStoreAlt } from "@fortawesome/free-solid-svg-icons";
import React, { useMemo } from "react";
import { useParams } from "react-router";
import { RecipeDefinition, SharingDefinition } from "@/types/definitions";
import { Card, Col, Row } from "react-bootstrap";
import GridLoader from "react-spinners/GridLoader";
import ActivateWizard from "@/options/pages/marketplace/ActivateWizard";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useFetch from "@/hooks/useFetch";

type BlueprintResponse = {
  config: RecipeDefinition;
  sharing: SharingDefinition;
  updated_at: string;
};

const ActivateBlueprintPage: React.FunctionComponent = () => {
  const { blueprintId } = useParams<{
    blueprintId: string;
  }>();
  const {
    data: blueprint,
    isLoading,
    error: fetchError,
  } = useFetch<BlueprintResponse>(`/api/recipes/${blueprintId}`);

  // Reshape to recipe definition
  const recipe: RecipeDefinition = useMemo(
    () => ({
      ...blueprint?.config,
      sharing: blueprint?.sharing,
      updated_at: blueprint?.updated_at,
    }),
    [blueprint]
  );

  const body = useMemo(() => {
    if (blueprint?.config?.extensionPoints != null) {
      return <ActivateWizard blueprint={recipe} />;
    }

    if (blueprint != null) {
      // There's nothing stopping someone from hitting the link with a non-blueprint (e.g., service, component). So
      // show an error message if not a valid blueprint
      return (
        <Card>
          <Card.Header>Invalid Blueprint</Card.Header>
          <Card.Body>
            <p className="text-danger">
              Error: {decodeURIComponent(blueprintId)} is not a valid blueprint.
              Please verify the link you received to activate the blueprint
            </p>

            <Link to={"/marketplace"} className="btn btn-info">
              <FontAwesomeIcon icon={faStoreAlt} /> Go to Marketplace
            </Link>
          </Card.Body>
        </Card>
      );
    }

    return <GridLoader />;
  }, [recipe, blueprint, blueprintId]);

  return (
    <Page
      title="Activate Blueprint"
      icon={faStoreAlt}
      description="Configure and activate a blueprint from the marketplace"
      isPending={isLoading}
      error={fetchError}
    >
      <Row>
        <Col xl={8} lg={10} md={12}>
          <ErrorBoundary>{body}</ErrorBoundary>
        </Col>
      </Row>
    </Page>
  );
};

export default ActivateBlueprintPage;
