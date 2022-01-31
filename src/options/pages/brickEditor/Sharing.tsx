/* eslint-disable filenames/match-exported */
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

import BootstrapSwitchButton from "bootstrap-switch-button-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobe } from "@fortawesome/free-solid-svg-icons";
import { sortBy, uniq } from "lodash";
import { Table } from "react-bootstrap";
import React from "react";
import { useField } from "formik";
import { useGetOrganizationsQuery } from "@/services/api";

const SharingTable: React.FunctionComponent = () => {
  const { data: organizations = [] } = useGetOrganizationsQuery();
  const [publicField, , { setValue: setPublic }] = useField("public");
  const [organizationsField, , { setValue: setOrganizations }] = useField(
    "organizations"
  );

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
                  <i> &ndash; visible to all PixieBrix users</i>
                </span>
              </span>
            ) : (
              <span>
                <FontAwesomeIcon icon={faGlobe} /> Public
              </span>
            )}
          </td>
        </tr>
        {sortBy(organizations, (x) => x.name).map((organization) => (
          <tr key={organization.id}>
            <td width="100">
              <BootstrapSwitchButton
                onlabel=" "
                offlabel=" "
                checked={organizationsField.value.includes(organization.id)}
                onChange={(checked: boolean) => {
                  const next = checked
                    ? uniq([...organizationsField.value, organization.id])
                    : organizationsField.value.filter(
                        (x: string) => x !== organization.id
                      );
                  setOrganizations(next);
                }}
              />
            </td>
            <td>{organization.name}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default SharingTable;
