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

import React, { useMemo } from "react";
import ServiceAuthSelector, {
  useAuthOptions,
} from "@/options/pages/extensionEditor/ServiceAuthSelector";
import { uniq } from "lodash";
import { Card, Table } from "react-bootstrap";
import { Link } from "react-router-dom";
import { RecipeDefinition } from "@/types/definitions";
import { useSelectedExtensions } from "@/options/pages/marketplace/ConfigureBody";

interface OwnProps {
  blueprint: RecipeDefinition;
}

const ServicesBody: React.FunctionComponent<OwnProps> = ({ blueprint }) => {
  const [authOptions] = useAuthOptions();

  const selected = useSelectedExtensions(blueprint.extensionPoints);

  const services = useMemo(
    () => uniq(selected.flatMap((x) => Object.values(x.services ?? {}))),
    [selected]
  );

  return (
    <>
      <Card.Body className="p-3">
        <p>
          Select which services and resources to use with the blueprint. You can
          configure additional services using the{" "}
          <Link to="/services">Services page</Link>
        </p>
      </Card.Body>
      <Table>
        <thead>
          <tr>
            <th>Service</th>
            <th className="w-100">Configuration</th>
          </tr>
        </thead>
        <tbody>
          {services.map((serviceId) => (
            <tr key={serviceId}>
              <td>
                <code>{serviceId}</code>
              </td>
              <td>
                <div style={{ maxWidth: 250 }}>
                  <ServiceAuthSelector
                    name={`services.${serviceId}`}
                    serviceId={serviceId}
                    authOptions={authOptions}
                  />
                </div>
              </td>
            </tr>
          ))}
          {services.length === 0 && (
            <tr>
              <td colSpan={2}>No services to configure</td>
            </tr>
          )}
        </tbody>
      </Table>
    </>
  );
};

export default ServicesBody;
