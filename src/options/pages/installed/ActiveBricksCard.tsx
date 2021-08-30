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
import { ResolvedExtension } from "@/core";
import { ExportBlueprintAction, RemoveAction } from "./installedPageTypes";
import { Card, Col, Row, Table } from "react-bootstrap";
import ExtensionGroup from "./ExtensionGroup";
import ExtensionGroupHeader from "./ExtensionGroupHeader";
import ExtensionRow from "./ExtensionRow";
import { groupBy } from "lodash";

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

  const marketplaceExtensionGroupss = groupByRecipe(
    extensions.filter(
      (extension) => extension._recipe && !extension._deployment
    )
  );

  const deploymentGroupss = groupByRecipe(
    extensions.filter((extension) => extension._deployment)
  );

  return (
    <Row>
      <Col xl={9} lg={10} md={12}>
        <Card className="ActiveBricksCard">
          <Card.Header>Active Bricks</Card.Header>
          <Table>
            <thead>
              <tr>
                <th>&nbsp;</th>
                <th>Name</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {personalExtensions.length > 0 && (
                <>
                  <ExtensionGroupHeader label="Personal Bricks" />
                  {personalExtensions.map((extension) => (
                    <ExtensionRow
                      key={extension.id}
                      extension={extension}
                      onRemove={onRemove}
                      onExportBlueprint={onExportBlueprint}
                    />
                  ))}
                </>
              )}

              {marketplaceExtensionGroupss.length > 0 && (
                <>
                  <ExtensionGroupHeader label="Marketplace Bricks" />
                  {marketplaceExtensionGroupss.map((extensions) => (
                    <ExtensionGroup
                      key={extensions[0]._recipe.id}
                      label={
                        extensions[0]._recipe.name ?? extensions[0]._recipe.id
                      }
                      extensions={extensions}
                      onRemove={onRemove}
                      onExportBlueprint={onExportBlueprint}
                    />
                  ))}
                </>
              )}

              {deploymentGroupss.length > 0 && (
                <>
                  <ExtensionGroupHeader label="Automatic Team Deploymentss" />
                  {deploymentGroupss.map((extensions) => (
                    <ExtensionGroup
                      key={extensions[0]._recipe.id}
                      label={
                        extensions[0]._recipe.name ?? extensions[0]._recipe.id
                      }
                      extensions={extensions}
                      managed
                      onRemove={onRemove}
                      onExportBlueprint={onExportBlueprint}
                    />
                  ))}
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
