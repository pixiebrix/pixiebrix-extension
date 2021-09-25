/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { useSelector } from "react-redux";
import { Button, Card, Table } from "react-bootstrap";
import React, { useCallback, useContext } from "react";
import { IService, RawServiceConfiguration } from "@/core";
import { RootState } from "@/options/store";
import { uuidv4 } from "@/types/helpers";
import BrickModal from "@/components/brickModal/BrickModal";
import {
  faEyeSlash,
  faPlus,
  faSignOutAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import AuthContext from "@/auth/AuthContext";
import { deleteCachedAuth } from "@/background/requests";
import { ServicesState } from "@/options/slices";
import useNotifications from "@/hooks/useNotifications";
import styles from "./PrivateServicesCard.module.scss";

const selectConfiguredServices = ({ services }: { services: ServicesState }) =>
  Object.values(services.configured);

type OwnProps = {
  services: IService[];
  navigate: (url: string) => void;
  onCreate: (configuration: RawServiceConfiguration) => void;
};

const PrivateServicesCard: React.FunctionComponent<OwnProps> = ({
  services,
  navigate,
  onCreate,
}) => {
  const notify = useNotifications();
  const { isLoggedIn } = useContext(AuthContext);

  const configuredServices = useSelector<RootState, RawServiceConfiguration[]>(
    selectConfiguredServices
  );

  const resetAuth = useCallback(
    async (authId: string) => {
      try {
        await deleteCachedAuth(authId);
        notify.success("Reset login for integration");
      } catch (error: unknown) {
        notify.error("Error resetting login for integration", {
          error,
        });
      }
    },
    [notify]
  );

  const onSelect = useCallback(
    (service: IService) => {
      onCreate({
        id: uuidv4(),
        label: undefined,
        serviceId: service.id,
        config: {},
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
                  onClick={() => {
                    navigate("/services/zapier/");
                  }}
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
                <td>
                  {configuredService.label ? (
                    <span>{configuredService.label}</span>
                  ) : (
                    <span className="text-muted">No label provided</span>
                  )}
                </td>
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
                    onClick={() => {
                      navigate(
                        `/services/${encodeURIComponent(configuredService.id)}`
                      );
                    }}
                  >
                    Configure
                  </Button>

                  {service.isOAuth2 || service.isToken ? (
                    <Button
                      size="sm"
                      variant="dark"
                      onClick={async () => resetAuth(configuredService.id)}
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
        <BrickModal
          onSelect={onSelect}
          bricks={services}
          modalClassName={styles.ModalOverride}
          selectCaption={
            <span>
              <FontAwesomeIcon icon={faPlus} className="mr-1" /> Configure
            </span>
          }
          caption="Add Private Integration"
        />
      </Card.Footer>
    </>
  );
};

export default PrivateServicesCard;
