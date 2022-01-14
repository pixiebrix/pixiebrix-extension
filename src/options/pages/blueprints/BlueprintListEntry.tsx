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

type Installable = RecipeDefinition | ResolvedExtension;

const isExtension = (blueprint: Installable): blueprint is ResolvedExtension =>
  "_recipe" in blueprint;

const BlueprintListEntry: React.FunctionComponent<{
  blueprint: ResolvedExtension | RecipeDefinition;
}> = ({ blueprint }) => {
  const { label, packageId, description, updated_at, active } = isExtension(
    blueprint
  )
    ? {
        label: blueprint.label,
        description: blueprint._recipe?.description,
        packageId: blueprint._recipe?.id,
        updated_at: blueprint._recipe?.updated_at ?? blueprint.updateTimestamp,
        active: blueprint.active,
      }
    : {
        label: blueprint.metadata.name,
        description: blueprint.metadata.description,
        packageId: blueprint.metadata.id,
        updated_at: blueprint.updated_at,
        active: blueprint.active,
      };

  return (
    <tr>
      <td className="text-wrap">
        <span className="text-wrap">{label}</span>
        <br />
        <span className="text-muted text-wrap">{description}</span>
      </td>
      <td>
        <div className={styles.sharing}>
          {packageId && <code className="p-0 small">{packageId}</code>}
        </div>
      </td>
      <td className="text-wrap">
        <span className="small">
          Last updated: {moment.utc(updated_at).fromNow()}
        </span>
      </td>
      <td>
        {active ? (
          "Active"
        ) : (
          <Button size="sm" variant="info">
            Activate
          </Button>
        )}
      </td>
      <td>{active && <EllipsisMenu items={[]} />}</td>
    </tr>
  );
};

export default BlueprintListEntry;
