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
import React from "react";
import { Card, Col, Row } from "react-bootstrap";
import ActivateRecipeCard from "@/extensionConsole/pages/activateRecipe/ActivateRecipeCard";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import RequireBrickRegistry from "@/extensionConsole/components/RequireBrickRegistry";
import { useGetRecipeQuery } from "@/services/api";
import { useSelector } from "react-redux";
import { selectRecipeHasAnyExtensionsInstalled } from "@/store/extensionsSelectors";
import { useRecipeIdParam } from "@/extensionConsole/pages/useRecipeIdParam";

const ActivateRecipePageContent: React.FC = () => {
  const recipeId = useRecipeIdParam();
  // Page parent component below is gating this content component on isFetching, so
  // recipe will always be resolved here
  const { data: recipe } = useGetRecipeQuery({ recipeId }, { skip: !recipeId });

  if (recipe.extensionPoints) {
    // Require that bricks have been fetched at least once before showing. Handles new installs where the bricks
    // haven't been completely fetched yet.
    // XXX: we might also want to enforce a full re-sync of the brick registry to ensure the latest brick
    // definitions are available for determining permissions. That's likely not required though, as brick permissions
    // do not change frequently.
    return (
      <RequireBrickRegistry>
        <ActivateRecipeCard />
      </RequireBrickRegistry>
    );
  }

  // There's nothing stopping someone from hitting the link with a non-blueprint (e.g., service, component). So
  // show an error message if not a valid blueprint
  return (
    <Card>
      <Card.Header>Invalid Mod</Card.Header>
      <Card.Body>
        <p className="text-danger">
          Error: {decodeURIComponent(recipeId)} is not a valid mod. Please
          verify the link you received to activate the mod
        </p>

        <Link to="/marketplace" className="btn btn-info">
          <FontAwesomeIcon icon={faStoreAlt} /> Go to Marketplace
        </Link>
      </Card.Body>
    </Card>
  );
};

const ActivateRecipePage: React.FunctionComponent = () => {
  const recipeId = useRecipeIdParam();
  const isReinstall = useSelector(
    selectRecipeHasAnyExtensionsInstalled(recipeId)
  );
  const actionText = isReinstall ? "Reactivate" : "Activate";

  const { isFetching, error } = useGetRecipeQuery(
    { recipeId },
    {
      // Force-refetch the latest data for this recipe before activation
      refetchOnMountOrArgChange: true,
    }
  );

  return (
    <Page
      title={`${actionText} Mod`}
      icon={faStoreAlt}
      isPending={isFetching}
      error={error}
    >
      <Row>
        <Col xs={12} xl={10}>
          <ErrorBoundary>
            <ActivateRecipePageContent />
          </ErrorBoundary>
        </Col>
      </Row>
    </Page>
  );
};

export default ActivateRecipePage;
