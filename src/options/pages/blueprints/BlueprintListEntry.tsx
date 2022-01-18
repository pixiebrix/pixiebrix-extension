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
import styles from "@/options/pages/blueprints/BlueprintsList.module.scss";
import moment from "moment";
import { Button } from "react-bootstrap";
import EllipsisMenu from "@/components/ellipsisMenu/EllipsisMenu";
import {
  getInstallableInfo,
  Installable,
} from "@/options/pages/blueprints/installableUtils";
import SharingLabel from "@/options/pages/blueprints/SharingLabel";
import BlueprintActions from "@/options/pages/blueprints/BlueprintActions";

const BlueprintListEntry: React.FunctionComponent<{
  installable: Installable;
}> = ({ installable }) => {
  const {
    label,
    packageId,
    description,
    updated_at,
    active,
  } = getInstallableInfo(installable);

  return (
    <tr>
      <td className="text-wrap">
        <h5 className="text-wrap m-0">{label}</h5>
        <span className="text-muted text-wrap">{description}</span>
      </td>
      <td>
        <div className={styles.sharing}>
          {packageId && (
            <>
              <code className="p-0">{packageId}</code>
              <br />
            </>
          )}
          <SharingLabel installable={installable} />
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
      <td>{active && <BlueprintActions installable={installable} />}</td>
    </tr>
  );
};

export default BlueprintListEntry;
