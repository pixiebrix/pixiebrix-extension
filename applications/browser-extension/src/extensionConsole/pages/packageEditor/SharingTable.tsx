/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import BootstrapSwitchButton from "bootstrap-switch-button-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobe } from "@fortawesome/free-solid-svg-icons";
import { sortBy, uniq } from "lodash";
import { Table } from "react-bootstrap";
import React from "react";
import { useField } from "formik";
import { useGetOrganizationsQuery } from "../../../data/service/api";
import { type UUID } from "../../../types/stringTypes";
import { type Team } from "../../../data/model/Team";

const SharingTable: React.FunctionComponent = () => {
  const { data: teams = [] } = useGetOrganizationsQuery();
  const [publicField, , { setValue: setPublic }] = useField("public");
  const [teamsField, , { setValue: setTeams }] =
    useField<Array<Team["teamId"]>>("organizations");

  return (
    <Table>
      <tbody>
        <tr>
          <td width="100">
            <BootstrapSwitchButton
              onlabel=" "
              offlabel=" "
              checked={publicField.value}
              onChange={setPublic}
            />
          </td>
          <td>
            {publicField.value ? (
              <span>
                <FontAwesomeIcon icon={faGlobe} /> Public{" "}
                <span className="text-primary">
                  <em> &ndash; visible to all PixieBrix users</em>
                </span>
              </span>
            ) : (
              <span>
                <FontAwesomeIcon icon={faGlobe} /> Public
              </span>
            )}
          </td>
        </tr>
        {sortBy(teams, (x) => x.teamName).map((team) => (
          <tr key={team.teamId}>
            <td width="100">
              <BootstrapSwitchButton
                onlabel=" "
                offlabel=" "
                checked={teamsField.value.includes(team.teamId)}
                onChange={async (checked: boolean) => {
                  const next = checked
                    ? uniq([...teamsField.value, team.teamId])
                    : teamsField.value.filter((x: UUID) => x !== team.teamId);
                  await setTeams(next);
                }}
              />
            </td>
            <td>{team.teamName}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default SharingTable;
