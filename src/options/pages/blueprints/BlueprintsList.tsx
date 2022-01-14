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

import { Button, Card, Table } from "react-bootstrap";
import React from "react";
import { RecipeDefinition } from "@/types/definitions";
import { ResolvedExtension } from "@/core";
import styles from "./BlueprintsList.module.scss";
import BlueprintListEntry from "@/options/pages/blueprints/BlueprintListEntry";

const BlueprintsList: React.FunctionComponent<{
  blueprints: ResolvedExtension[] | RecipeDefinition[];
}> = ({ blueprints }) => {
  const getUniqueId = (blueprint: ResolvedExtension | RecipeDefinition) => {
    return "id" in blueprint ? blueprint.id : blueprint.metadata.id;
  };

  return (
    <Card className={styles.root}>
      <Table>
        <tbody>
          {blueprints.map((blueprint) => (
            <BlueprintListEntry
              key={getUniqueId(blueprint)}
              blueprint={blueprint}
            />
          ))}
        </tbody>
      </Table>
    </Card>
  );
};

export default BlueprintsList;
