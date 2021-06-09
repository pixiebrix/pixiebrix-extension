/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import Card from "react-bootstrap/Card";
import Table from "react-bootstrap/Table";
import React from "react";
import { useAsyncState } from "@/hooks/common";
import { getBaseURL } from "@/services/baseService";
import urljoin from "url-join";
import { GridLoader } from "react-spinners";
import { SanitizedAuth } from "@/types/contract";
import { faUsers } from "@fortawesome/free-solid-svg-icons/faUsers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface OwnProps {
  remoteAuths: SanitizedAuth[];
}

const SharedServicesCard: React.FunctionComponent<OwnProps> = ({
  remoteAuths,
}) => {
  const [serviceUrl] = useAsyncState(getBaseURL);

  return (
    <>
      <Card.Body className="pb-2 px-3">
        <p className="text-info">
          <FontAwesomeIcon icon={faUsers} /> Shared integrations made available
          by your team and/or built-in to PixieBrix
        </p>
      </Card.Body>
      {remoteAuths ? (
        <Table>
          <thead>
            <tr>
              <th>Team</th>
              <th>Label</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {remoteAuths.map((remoteAuth) => (
              <tr key={remoteAuth.id}>
                <td>{remoteAuth.organization?.name ?? "✨ Built-in"}</td>
                <td>{remoteAuth.label}</td>
                <td>
                  <div>{remoteAuth.service.config.metadata.name}</div>
                  <div>
                    <code className="p-0" style={{ fontSize: "0.7rem" }}>
                      {remoteAuth.service.config.metadata.id}
                    </code>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Card.Body>
          <GridLoader />
        </Card.Body>
      )}
      <Card.Footer>
        {serviceUrl ? (
          <span className="py-3">
            To configure shared services, open the{" "}
            <a
              href={urljoin(serviceUrl, "services")}
              target="_blank"
              rel="noopener noreferrer"
            >
              PixieBrix website
            </a>
          </span>
        ) : (
          <span className="py-3">
            To configure shared services,
            <a href="#" target="_blank" rel="noopener noreferrer">
              create a PixieBrix account
            </a>
          </span>
        )}
      </Card.Footer>
    </>
  );
};

export default SharedServicesCard;
