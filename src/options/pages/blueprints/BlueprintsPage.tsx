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

import React, { useContext, useEffect, useMemo, useState } from "react";
import { useTitle } from "@/hooks/title";
import Page from "@/layout/Page";
import { faExternalLinkAlt, faScroll } from "@fortawesome/free-solid-svg-icons";
import { Button, Card, Col, ListGroup, Nav, Row, Table } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { OptionsState } from "@/store/extensions";
import { selectExtensions } from "@/options/selectors";
import { connect } from "react-redux";
import { IExtension, UUID } from "@/core";
import useFetch from "@/hooks/useFetch";
import { RecipeDefinition } from "@/types/definitions";
import { CloudExtension } from "@/types/contract";
import { useAsyncState } from "@/hooks/common";
import { resolveDefinitions } from "@/registry/internal";
import AuthContext from "@/auth/AuthContext";
import { isPersonalBrick } from "@/options/pages/installed/ActiveBricksCard";

const BlueprintsPage: React.FunctionComponent<{
  // TODO: maybe rename this to activeBlueprints or installedBlueprints where appropriate
  extensions: IExtension[];
}> = ({ extensions }) => {
  useTitle("Blueprints");
  const { scope } = useContext(AuthContext);

  const [filteredBlueprints, setFilteredBlueprints] = useState([]);

  const { data: rawRecipes, isLoading: isRecipesLoading } = useFetch<
    RecipeDefinition[]
  >("/api/recipes/");
  const {
    data: cloudExtensions,
    isLoading: isCloudExtensionsLoading,
  } = useFetch<CloudExtension[]>("/api/extensions");
  const installedExtensions = new Set<UUID>(
    extensions.map((extension) => extension.id)
  );

  console.log("Extensions:", extensions);
  console.log("Cloud extensions:", cloudExtensions);

  const [allExtensions, , cloudError] = useAsyncState(
    async () => {
      const inactiveExtensions = cloudExtensions
        .filter((x) => !installedExtensions.has(x.id))
        .map((x) => ({ ...x, active: false }));

      return [...extensions, ...inactiveExtensions];
    },
    [extensions, cloudExtensions],
    extensions ?? []
  );

  const [resolvedExtensions, , resolveError] = useAsyncState(
    async () =>
      Promise.all(
        allExtensions.map(async (extension) => resolveDefinitions(extension))
      ),
    [allExtensions],
    []
  );

  console.log("Resolved extensions:", resolvedExtensions);

  const { personalBlueprints, teamBlueprints } = useMemo(() => {
    const installedRecipes = new Set(
      extensions.map((extension) => extension._recipe?.id)
    );

    const personalBlueprints = (rawRecipes ?? [])
      .filter((recipe) => recipe.metadata.id.includes(scope))
      .map((recipe) => ({
        ...recipe,
        active: installedRecipes.has(recipe.metadata.id),
      }));

    const teamBlueprints = (rawRecipes ?? [])
      .filter((recipe) => recipe.sharing.organizations.length > 0)
      .map((recipe) => ({
        ...recipe,
        active: installedRecipes.has(recipe.metadata.id),
      }));
    return { personalBlueprints, teamBlueprints };
  }, [extensions, rawRecipes, scope]);

  const activeExtensions = useMemo(
    () => resolvedExtensions?.filter((extension) => extension.active),
    [resolvedExtensions]
  );

  const filterBlueprints = (filter: string) => {
    if (filter === "active") {
      setFilteredBlueprints(activeExtensions);
    }

    if (filter === "all") {
      setFilteredBlueprints([
        ...resolvedExtensions,
        ...personalBlueprints,
        ...teamBlueprints,
      ]);
    }

    if (filter === "personal") {
      setFilteredBlueprints([
        ...resolvedExtensions.filter((extension) =>
          isPersonalBrick(extension, scope)
        ),
        ...personalBlueprints,
      ]);
    }

    if (filter === "shared") {
      setFilteredBlueprints(teamBlueprints);
    }
  };

  // Guard race condition with load when visiting the URL directly
  const noExtensions =
    extensions.length === 0 &&
    allExtensions != null &&
    allExtensions.length === 0;

  const isLoading =
    noExtensions || isRecipesLoading || isCloudExtensionsLoading;

  return (
    <Page
      icon={faScroll}
      title={"Blueprints"}
      description={
        "Here you can find personal blueprints and blueprints shared with you to activate."
      }
      toolbar={
        <Button variant="info">
          <FontAwesomeIcon icon={faExternalLinkAlt} /> Open Public Marketplace
        </Button>
      }
      isPending={isLoading}
      error={cloudError ?? resolveError}
    >
      <Row>
        <Col xs={3}>
          <Nav
            className="flex-column"
            variant="pills"
            defaultActiveKey="active"
          >
            <Nav.Item>
              <Nav.Link
                eventKey="active"
                onClick={() => filterBlueprints("active")}
              >
                Active Blueprints
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="all" onClick={() => filterBlueprints("all")}>
                All Blueprints
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                eventKey="shared"
                onClick={() => filterBlueprints("shared")}
              >
                Shared with Me
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                eventKey="personal"
                onClick={() => filterBlueprints("personal")}
              >
                Personal Blueprints
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Col>
        <Col xs={9}>
          <h3>Active Blueprints</h3>
          {resolvedExtensions?.length > 0 && (
            <Card>
              <Table>
                {filteredBlueprints.map((extension) => (
                  <tr key={extension.id}>
                    <td>
                      {extension.label
                        ? extension.label
                        : extension.metadata.name}
                    </td>
                  </tr>
                ))}
              </Table>
            </Card>
          )}
        </Col>
      </Row>
    </Page>
  );
};

const mapStateToProps = (state: { options: OptionsState }) => ({
  extensions: selectExtensions(state),
});

export default connect(mapStateToProps)(BlueprintsPage);
