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

import { useSelector } from "react-redux";
import { Card, Table, Button } from "react-bootstrap";
import React, { useCallback, useContext } from "react";
import { RawServiceConfiguration, IService, ServiceConfig } from "@/core";
import { RootState } from "../../store";
import { v4 as uuidv4 } from "uuid";
import { ServiceDefinition } from "@/types/definitions";
import ServiceModal from "@/components/fields/ServiceModal";
import { useFetch } from "@/hooks/fetch";
import { faEyeSlash, faSignOutAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AuthContext } from "@/auth/context";
import { useToasts } from "react-toast-notifications";
import { deleteCachedAuth } from "@/background/requests";
import { reportError } from "@/telemetry/logging";
import { ServicesState } from "@/options/slices";

interface OwnProps {
  services: IService[];
  navigate: (x: string) => void;
  onCreate: (x: RawServiceConfiguration) => void;
}

const selectConfiguredServices = ({ services }: { services: ServicesState }) =>
  Object.values(services.configured);

const PrivateServicesCard: React.FunctionComponent<OwnProps> = ({
  services,
  navigate,
  onCreate,
}) => {
  const { addToast } = useToasts();
  const { isLoggedIn } = useContext(AuthContext);

  const serviceConfigs = useFetch("/api/services/") as ServiceDefinition[];

  const configuredServices = useSelector<RootState, RawServiceConfiguration[]>(
    selectConfiguredServices
  );

  const resetAuth = useCallback(
    async (authId: string) => {
      try {
        await deleteCachedAuth(authId);
        addToast("Reset login for integration", {
          appearance: "success",
          autoDismiss: true,
        });
      } catch (err) {
        reportError(err);
        addToast("Error resetting login for integration", {
          appearance: "error",
          autoDismiss: true,
        });
      }
    },
    [addToast]
  );

  const onSelect = useCallback(
    (x: ServiceDefinition) => {
      onCreate({
        id: uuidv4(),
        label: undefined,
        serviceId: x.metadata.id,
        config: {} as ServiceConfig,
      } as RawServiceConfiguration);
    },
    [onCreate]
  );

  return (
    <>
      <Card.Body className="pb-2 px-3">
        <p className="text-info">
          <FontAwesomeIcon icon={faEyeSlash} /> Private configurations are
          stored in your browser. They are never transmitted to the PixieBrix
          servers or shared with your team
        </p>
      </Card.Body>
      <Table responsive>
        <thead>
          <tr>
            <th>Label</th>
            <th>Type</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoggedIn && (
            <tr>
              <td>
                Zapier <i>&ndash; use to connect to PixieBrix from Zapier</i>
              </td>
              <td className="text-muted small">N/A</td>
              <td>
                <Button
                  style={{ width: 100 }}
                  variant="info"
                  size="sm"
                  onClick={() => navigate(`/services/zapier/`)}
                >
                  View Key
                </Button>
              </td>
            </tr>
          )}

          {configuredServices.map((configuredService) => {
            const service = services.find(
              (x) => x.id === configuredService.serviceId
            );
            if (!service) {
              throw new Error(`Unknown service ${configuredService.serviceId}`);
            }
            return (
              <tr
                key={`${configuredService.serviceId}-${configuredService.id}`}
              >
                <td>{configuredService.label}</td>
                <td>
                  <div>{service.name}</div>
                  <div>
                    <code className="p-0" style={{ fontSize: "0.7rem" }}>
                      {service.id}
                    </code>
                  </div>
                </td>
                <td>
                  <Button
                    style={{ width: 100 }}
                    variant="info"
                    size="sm"
                    onClick={() =>
                      navigate(
                        `/services/${encodeURIComponent(configuredService.id)}`
                      )
                    }
                  >
                    Configure
                  </Button>

                  {service.isOAuth2 || service.isToken ? (
                    <Button
                      size="sm"
                      variant="dark"
                      onClick={() => resetAuth(configuredService.id)}
                    >
                      <FontAwesomeIcon icon={faSignOutAlt} /> Reset Token
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline-dark" disabled>
                      <FontAwesomeIcon icon={faSignOutAlt} /> Reset Token
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <Card.Footer>
        <ServiceModal
          onSelect={onSelect}
          services={serviceConfigs}
          caption="Add private integration"
          variant="primary"
        />
      </Card.Footer>
    </>
  );
};

export default PrivateServicesCard;
