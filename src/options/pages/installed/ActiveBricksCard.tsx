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

import React from "react";
import { MessageContext, ResolvedExtension } from "@/core";
import { ExportBlueprintAction, RemoveAction } from "./installedPageTypes";
import { Card, Col, Row, Table } from "react-bootstrap";
import ExtensionGroup from "./ExtensionGroup";
import ExtensionGroupHeader from "./ExtensionGroupHeader";
import { groupBy } from "lodash";
import ExtensionRows from "./ExtensionRows";

const groupByRecipe = (
  extensions: ResolvedExtension[]
): ResolvedExtension[][] =>
  Object.values(groupBy(extensions, (extension) => extension._recipe.id));

const ActiveBricksCard: React.FunctionComponent<{
  extensions: ResolvedExtension[];
  onRemove: RemoveAction;
  onExportBlueprint: ExportBlueprintAction;
}> = ({ extensions, onRemove, onExportBlueprint }) => {
  const personalExtensions = extensions.filter(
    (extension) => !extension._recipe && !extension._deployment
  );

  const marketplaceExtensionGroups = groupByRecipe(
    extensions.filter(
      (extension) => extension._recipe && !extension._deployment
    )
  );

  const deploymentGroups = groupByRecipe(
    extensions.filter((extension) => extension._deployment)
  );

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

              {marketplaceExtensionGroups.length > 0 && (
                <>
                  <ExtensionGroupHeader label="Marketplace Bricks" />
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

              {deploymentGroups.length > 0 && (
                <>
                  <ExtensionGroupHeader label="Automatic Team Deployments" />
                  {deploymentGroups.map((extensions) => {
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
