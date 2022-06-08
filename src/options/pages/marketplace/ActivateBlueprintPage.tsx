/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { useLocation, useParams } from "react-router";
import { RecipeDefinition } from "@/types/definitions";
import { Card, Col, Row } from "react-bootstrap";
import Loader from "@/components/Loader";
import ActivateWizard from "@/options/pages/marketplace/ActivateWizard";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useFetch from "@/hooks/useFetch";
import { BlueprintResponse } from "@/types/contract";
import { pick } from "lodash";

const ActivateBlueprintPage: React.FunctionComponent = () => {
  const location = useLocation();

  const { blueprintId } = useParams<{
    blueprintId: string;
  }>();

  const reinstall =
    new URLSearchParams(location.search).get("reinstall") === "1";

  const {
    data: remoteBlueprint,
    isLoading: fetchingBlueprint,
    error: fetchError,
  } = useFetch<BlueprintResponse>(`/api/recipes/${blueprintId}`);

  // Reshape to recipe definition
  const recipeDefinition: RecipeDefinition | null = useMemo(() => {
    if (remoteBlueprint) {
      return {
        ...remoteBlueprint.config,
        ...pick(remoteBlueprint, ["sharing", "updated_at"]),
      };
    }

    return null;
  }, [remoteBlueprint]);

  const body = useMemo(() => {
    if (remoteBlueprint?.config?.extensionPoints != null) {
      return <ActivateWizard blueprint={recipeDefinition} />;
    }

    if (remoteBlueprint != null) {
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

    return <Loader />;
  }, [recipeDefinition, remoteBlueprint, blueprintId]);

  const action = reinstall ? "Reactivate" : "Activate";

  return (
    <Page
      title={`${action} Blueprint`}
      icon={faStoreAlt}
      description="Configure and activate a blueprint from the marketplace"
      isPending={fetchingBlueprint}
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
