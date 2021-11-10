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

import React, { useContext, useMemo } from "react";
import { MessageContext, ResolvedExtension, UUID } from "@/core";
import { ExportBlueprintAction, RemoveAction } from "./installedPageTypes";
import { Card, Col, Row, Table } from "react-bootstrap";
import ExtensionGroup from "./ExtensionGroup";
import ExtensionGroupHeader from "./ExtensionGroupHeader";
import { groupBy } from "lodash";
import ExtensionRows from "./ExtensionRows";
import { isDeploymentActive } from "@/options/deploymentUtils";
import { useGetOrganizationsQuery } from "@/services/api";
import AuthContext from "@/auth/AuthContext";

const groupByRecipe = (
  extensions: ResolvedExtension[]
): ResolvedExtension[][] =>
  Object.values(groupBy(extensions, (extension) => extension._recipe.id));

const groupByOrganizationId = (
  extensions: ResolvedExtension[]
): Array<[UUID, ResolvedExtension[]]> =>
  (Object.entries(
    groupBy(
      extensions,
      // For the uncommon scenario that a user would be a part of two or more organizations
      // with which the recipe is shared, we arbitrarily choose the first one
      (extension) => extension._recipe.sharing.organizations[0]
    )
    // Could not figure out nominal type for UUID
  ) as unknown) as Array<[UUID, ResolvedExtension[]]>;

const isPublic = (extension: ResolvedExtension) =>
  extension._recipe?.sharing?.public;

const hasOrganization = (extension: ResolvedExtension) =>
  extension._recipe?.sharing?.organizations.length > 0;

const isPersonal = (extension: ResolvedExtension, scope: string) =>
  // FIXME: recipes that I own that I have not shared with anyone should go under their own heading and be grouped by
  //  recipe. The "personal bricks" section should only include extensions that don't correspond to a versioned recipe
  (scope && extension._recipe?.id.startsWith(scope + "/")) ||
  (!extension._recipe && !extension._deployment);

const groupExtensions = (extensions: ResolvedExtension[], scope: string) => {
  const personal = [];
  const marketplace = [];
  const team = [];
  const deployment = [];
  // `other` is the users ad-hoc extensions that aren't part of a recipe/blueprint
  const other = [];

  for (const extension of extensions) {
    if (isPersonal(extension, scope)) {
      personal.push(extension);
      continue;
    }

    if (extension._deployment) {
      deployment.push(extension);
      continue;
    }

    if (isPublic(extension)) {
      marketplace.push(extension);
      continue;
    }

    if (hasOrganization(extension)) {
      team.push(extension);
      continue;
    }

    other.push(extension);
  }

  return { personal, marketplace, team, deployment, other };
};

const ActiveBricksCard: React.FunctionComponent<{
  extensions: ResolvedExtension[];
  onRemove: RemoveAction;
  onExportBlueprint: ExportBlueprintAction;
}> = ({ extensions, onRemove, onExportBlueprint }) => {
  const { data: organizations = [] } = useGetOrganizationsQuery();
  const { scope } = useContext(AuthContext);

  const getOrganizationName = (organizationId: UUID) =>
    organizations.find((organization) => organization.id === organizationId)
      ?.name;

  const sortedExtensions = useMemo(() => groupExtensions(extensions, scope), [
    extensions,
    scope,
  ]);

  const personalExtensions = sortedExtensions.personal;

  const marketplaceExtensionGroups = groupByRecipe(
    sortedExtensions.marketplace
  );

  const teamExtensionGroups = useMemo(
    () =>
      groupByOrganizationId(sortedExtensions.team).map(
        ([organizationId, extensions]) => ({
          organizationId,
          extensions: groupByRecipe(extensions),
        })
      ),
    [sortedExtensions]
  );

  const deploymentExtensionGroups = groupByRecipe(sortedExtensions.deployment);

  // Sharing was added to _recipe recently (see the RecipeMetadata type and optionsSlice)
  // We still want to display extensions that do not have this information yet
  const otherExtensionGroups = groupByRecipe(sortedExtensions.other);

  return (
    <Row>
      <Col xl={9} lg={10} md={12}>
        <Card className="ActiveBricksCard">
          <Card.Header>Active Bricks</Card.Header>
          <Table>
            <tbody>
              {personalExtensions.length > 0 && (
                <>
                  <ExtensionGroupHeader label="Personal Bricks" />
                  <ExtensionRows
                    extensions={personalExtensions}
                    onRemove={onRemove}
                    onExportBlueprint={onExportBlueprint}
                  />
                </>
              )}

              {otherExtensionGroups.length > 0 && (
                <>
                  <ExtensionGroupHeader label="Marketplace Bricks" />
                  {otherExtensionGroups.map((extensions) => {
                    const recipe = extensions[0]._recipe;
                    const messageContext: MessageContext = {
                      blueprintId: recipe.id,
                    };

                    return (
                      <ExtensionGroup
                        key={recipe.id}
                        label={recipe.name}
                        extensions={extensions}
                        groupMessageContext={messageContext}
                        onRemove={onRemove}
                        onExportBlueprint={onExportBlueprint}
                      />
                    );
                  })}
                </>
              )}

              {marketplaceExtensionGroups.length > 0 && (
                <>
                  <ExtensionGroupHeader label="Public Marketplace Bricks" />
                  {marketplaceExtensionGroups.map((extensions) => {
                    const recipe = extensions[0]._recipe;
                    const messageContext: MessageContext = {
                      blueprintId: recipe.id,
                    };

                    return (
                      <ExtensionGroup
                        key={recipe.id}
                        label={recipe.name}
                        extensions={extensions}
                        groupMessageContext={messageContext}
                        onRemove={onRemove}
                        onExportBlueprint={onExportBlueprint}
                      />
                    );
                  })}
                </>
              )}

              {teamExtensionGroups.map((team, index) => (
                <>
                  <ExtensionGroupHeader
                    key={index}
                    label={`${getOrganizationName(team.organizationId)} Bricks`}
                  />
                  {team.extensions.map((extensions) => {
                    const recipe = extensions[0]._recipe;
                    const messageContext: MessageContext = {
                      blueprintId: recipe.id,
                    };

                    return (
                      <ExtensionGroup
                        key={recipe.id}
                        label={recipe.name}
                        extensions={extensions}
                        groupMessageContext={messageContext}
                        onRemove={onRemove}
                        onExportBlueprint={onExportBlueprint}
                      />
                    );
                  })}
                </>
              ))}

              {deploymentExtensionGroups.length > 0 && (
                <>
                  <ExtensionGroupHeader label="Automatic Team Deployments" />
                  {deploymentExtensionGroups.map((extensions) => {
                    const recipe = extensions[0]._recipe;
                    const deployment = extensions[0]._deployment;
                    const messageContext: MessageContext = {
                      blueprintId: recipe.id,
                      deploymentId: deployment.id,
                    };

                    return (
                      <ExtensionGroup
                        key={extensions[0]._recipe.id}
                        label={extensions[0]._recipe.name}
                        extensions={extensions}
                        managed
                        paused={!isDeploymentActive(extensions[0])}
                        groupMessageContext={messageContext}
                        onRemove={onRemove}
                        onExportBlueprint={onExportBlueprint}
                      />
                    );
                  })}
                </>
              )}
            </tbody>
          </Table>
        </Card>
      </Col>
    </Row>
  );
};

export default ActiveBricksCard;
