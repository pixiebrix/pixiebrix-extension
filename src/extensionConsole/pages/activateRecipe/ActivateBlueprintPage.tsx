/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { type RecipeDefinition } from "@/types/recipeTypes";
import { Card, Col, Row } from "react-bootstrap";
import Loader from "@/components/Loader";
import ActivateWizardCard from "@/extensionConsole/pages/activateRecipe/ActivateWizardCard";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useFetch from "@/hooks/useFetch";
import { type BlueprintResponse } from "@/types/contract";
import { pick } from "lodash";
import RequireBrickRegistry from "@/extensionConsole/components/RequireBrickRegistry";
import useActivateUrl from "@/extensionConsole/pages/activateRecipe/useActivateUrl";

const ActivateBlueprintPage: React.FunctionComponent = () => {
  const { blueprintId, isReinstall } = useActivateUrl();

  // Don't use RTK Query here. Always want the latest version of the blueprint. Otherwise, if the user had their
  // Extension Console open for a while, they may get the older version when they go to re-activate.
  // NOTE: the endpoint will return a 404 if an invalid registry was passed via URL
  const {
    data: remoteBlueprint,
    isLoading: fetchingBlueprint,
    error: fetchError,
  } = useFetch<BlueprintResponse>(`/api/recipes/${blueprintId}/`);

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
    if (remoteBlueprint?.config?.extensionPoints) {
      // Require that bricks have been fetched at least once before showing. Handles new installs where the bricks
      // haven't been completely fetched yet.
      // XXX: we might also want to enforce a full re-sync of the brick registry to ensure the latest brick
      // definitions are available for determining permissions. That's likely not required though, as brick permissions
      // do not change frequently.
      return (
        <RequireBrickRegistry>
          <ActivateWizardCard
            blueprint={recipeDefinition}
            isReinstall={isReinstall}
          />
        </RequireBrickRegistry>
      );
    }

    if (remoteBlueprint) {
      // There's nothing stopping someone from hitting the link with a non-blueprint (e.g., service, component). So
      // show an error message if not a valid blueprint
      return (
        <Card>
          <Card.Header>Invalid Mod</Card.Header>
          <Card.Body>
            <p className="text-danger">
              Error: {decodeURIComponent(blueprintId)} is not a valid mod.
              Please verify the link you received to activate the mod
            </p>

            <Link to="/marketplace" className="btn btn-info">
              <FontAwesomeIcon icon={faStoreAlt} /> Go to Marketplace
            </Link>
          </Card.Body>
        </Card>
      );
    }

    return <Loader />;
  }, [recipeDefinition, remoteBlueprint, blueprintId, isReinstall]);

  const action = isReinstall ? "Reactivate" : "Activate";

  return (
    <Page
      title={`${action} Mod`}
      icon={faStoreAlt}
      isPending={fetchingBlueprint}
      error={fetchError}
    >
      <Row>
        <Col xs={12} xl={10}>
          <ErrorBoundary>{body}</ErrorBoundary>
        </Col>
      </Row>
    </Page>
  );
};

export default ActivateBlueprintPage;
