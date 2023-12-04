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

import React, { useEffect } from "react";
import Page from "@/layout/Page";
import { faStoreAlt } from "@fortawesome/free-solid-svg-icons";
import { Card, Col, Row } from "react-bootstrap";
import ActivateModCard from "@/extensionConsole/pages/activateMod/ActivateModCard";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import RequireBrickRegistry from "@/extensionConsole/components/RequireBrickRegistry";
import { useGetRecipeQuery } from "@/services/api";
import { useSelector } from "react-redux";
import { selectRecipeHasAnyExtensionsInstalled } from "@/store/extensionsSelectors";
import useRegistryIdParam from "@/extensionConsole/pages/useRegistryIdParam";
import { isAxiosError } from "@/errors/networkErrorHelpers";
import notify from "@/utils/notify";
import { useHistory } from "react-router";

const ActivateModPageContent: React.FC = () => {
  const modId = useRegistryIdParam();
  // Page parent component below is gating this content component on isFetching, so
  // recipe will always be resolved here
  const { data: mod } = useGetRecipeQuery(
    { recipeId: modId },
    { skip: !modId },
  );

  if (mod.extensionPoints) {
    // Require that bricks have been fetched at least once before showing. Handles new installs where the bricks
    // haven't been completely fetched yet.
    // XXX: we might also want to enforce a full re-sync of the brick registry to ensure the latest brick
    // definitions are available for determining permissions. That's likely not required though, as brick permissions
    // do not change frequently.
    return (
      <RequireBrickRegistry>
        <ActivateModCard />
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
          Error: {decodeURIComponent(modId)} is not a valid mod. Please verify
          the link you received to activate the mod
        </p>

        <Link to="/marketplace" className="btn btn-info">
          <FontAwesomeIcon icon={faStoreAlt} /> Go to Marketplace
        </Link>
      </Card.Body>
    </Card>
  );
};

const ActivateModPage: React.FunctionComponent = () => {
  const modId = useRegistryIdParam();
  const history = useHistory();
  const isReinstall = useSelector(selectRecipeHasAnyExtensionsInstalled(modId));

  const { isFetching, error } = useGetRecipeQuery(
    { recipeId: modId },
    {
      // Force-refetch the latest data for this recipe before activation
      refetchOnMountOrArgChange: true,
    },
  );

  const notFoundError = isAxiosError(error)
    ? error.response?.status === 404
    : false;

  useEffect(() => {
    if (notFoundError) {
      notify.error({
        message: "Hmm... we couldn't find that mod",
        error: new Error(
          "Double-check the mod url or contact a team admin to gain access to this mod.",
        ),
      });
      history.push("/mods");
    }
  }, [notFoundError, history]);

  if (notFoundError) {
    return null;
  }

  return (
    <Page
      title={`${isReinstall ? "Reactivate" : "Activate"} Mod`}
      icon={faStoreAlt}
      isPending={isFetching}
      error={error}
    >
      <Row>
        <Col xs={12} xl={10}>
          <ErrorBoundary>
            <ActivateModPageContent />
          </ErrorBoundary>
        </Col>
      </Row>
    </Page>
  );
};

export default ActivateModPage;
