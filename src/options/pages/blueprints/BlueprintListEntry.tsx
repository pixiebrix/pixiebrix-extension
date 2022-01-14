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

import React from "react";
import { ResolvedExtension } from "@/core";
import { RecipeDefinition } from "@/types/definitions";
import styles from "@/options/pages/blueprints/BlueprintsList.module.scss";
import moment from "moment";
import { Button } from "react-bootstrap";
import EllipsisMenu from "@/components/ellipsisMenu/EllipsisMenu";

const BlueprintListEntry: React.FunctionComponent<{
  blueprint: ResolvedExtension | RecipeDefinition;
}> = ({ blueprint }) => (
  <tr>
    <td className="text-wrap">
      <span className="text-wrap">
        {"label" in blueprint ? blueprint.label : blueprint.metadata.name}
      </span>
      <br />
      <span className="text-muted text-wrap">
        {"_recipe" in blueprint && blueprint._recipe && (
          <>{blueprint._recipe.description}</>
        )}
        {"metadata" in blueprint && blueprint.metadata && (
          <>{blueprint.metadata.description}</>
        )}
      </span>
    </td>
    <td>
      <div className={styles.sharing}>
        {"_recipe" in blueprint && blueprint._recipe && (
          <>
            <code className="p-0 small">{blueprint._recipe.id}</code>
          </>
        )}
        {"metadata" in blueprint && blueprint.metadata && (
          <>
            <code className="p-0 small">{blueprint.metadata.id}</code>
          </>
        )}
      </div>
    </td>
    <td className="text-wrap">
      <span className="small">
        Last updated:{" "}
        {"updated_at" in blueprint &&
          //moment.utc(blueprint.updated_at).format("MMMM Do YYYY, h:mm:ss a")
          moment.utc(blueprint.updated_at).fromNow()}
        {"_recipe" in blueprint &&
          blueprint._recipe &&
          //moment.utc(blueprint._recipe.updated_at).format("MMMM Do YYYY, h:mm:ss a")
          moment.utc(blueprint._recipe.updated_at).fromNow()}
        {"_recipe" in blueprint &&
          !blueprint._recipe &&
          //moment.utc(blueprint.updateTimestamp).format("MMMM Do YYYY, h:mm:ss a")
          moment.utc(blueprint.updateTimestamp).fromNow()}
      </span>
    </td>
    <td>
      {blueprint.active ? (
        "Active"
      ) : (
        <Button size="sm" variant="info">
          Activate
        </Button>
      )}
    </td>
    <td>{blueprint.active && <EllipsisMenu items={[]} />}</td>
  </tr>
);

export default BlueprintListEntry;
