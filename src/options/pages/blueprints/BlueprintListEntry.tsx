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
import { Button } from "react-bootstrap";
import SharingLabel from "@/options/pages/blueprints/SharingLabel";
import BlueprintActions from "@/options/pages/blueprints/BlueprintActions";
import useInstallableActions from "@/options/pages/blueprints/useInstallableActions";
import { timeSince } from "@/utils/timeUtils";
import { Row } from "react-table";
import { getPackageId } from "@/options/pages/blueprints/installableUtils";

const BlueprintListEntry: React.FunctionComponent<{
  installableRow: Row;
}> = ({ installableRow }) => {
  const {
    name,
    description,
    sharing,
    updatedAt,
    status,
    installable,
  } = installableRow.values;
  const { activate, reinstall } = useInstallableActions(installable);
  // TODO: fix the parsing (timezone, some not being parsed)
  const lastUpdated = timeSince(new Date(updatedAt).getTime());

  return (
    <tr>
      <td className="text-wrap">
        <h5 className="text-wrap m-0">{name}</h5>
        <span className="text-muted text-wrap">{description}</span>
      </td>
      <td>
        <div className={styles.sharing}>
          {getPackageId(installable) && (
            <>
              <code className="p-0">{getPackageId(installable)}</code>
              <br />
            </>
          )}
          <SharingLabel installable={installable} />
        </div>
      </td>
      <td className="text-wrap">
        <span className="small">Last updated: {lastUpdated}</span>
      </td>
      <td>
        {installable.active ? (
          <>
            {installable.hasUpdate ? (
              <Button size="sm" variant="warning" onClick={reinstall}>
                Update
              </Button>
            ) : (
              "Active"
            )}
          </>
        ) : (
          <Button size="sm" variant="info" onClick={activate}>
            Activate
          </Button>
        )}
      </td>
      <td>
        <BlueprintActions installable={installable} />
      </td>
    </tr>
  );
};

export default BlueprintListEntry;
