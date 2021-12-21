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
import React, { useCallback, useContext, useMemo, useState } from "react";
import { IService, RawServiceConfiguration, UUID } from "@/core";
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
import { deleteCachedAuthData } from "@/background/messenger/api";
import { ServicesState } from "@/options/slices";
import useNotifications from "@/hooks/useNotifications";
import styles from "./PrivateServicesCard.module.scss";
import EllipsisMenu from "@/components/ellipsisMenu/EllipsisMenu";
import { faEdit } from "@fortawesome/free-regular-svg-icons";
import BrickIcon from "@/components/BrickIcon";
import Pagination from "@/components/pagination/Pagination";

const selectConfiguredServices = ({ services }: { services: ServicesState }) =>
  Object.values(services.configured);

type OwnProps = {
  services: IService[];
  navigate: (url: string) => void;
  onCreate: (configuration: RawServiceConfiguration) => void;
};

const SERVICES_PER_PAGE = 10;

const PrivateServicesCard: React.FunctionComponent<OwnProps> = ({
  services,
  navigate,
  onCreate,
}) => {
  const notify = useNotifications();
  const { isLoggedIn } = useContext(AuthContext);
  const [page, setPage] = useState(0);

  const configuredServices = useSelector<RootState, RawServiceConfiguration[]>(
    selectConfiguredServices
  );

  const resetAuth = useCallback(
    async (authId: UUID) => {
      try {
        await deleteCachedAuthData(authId);
        notify.success("Reset login for integration");
      } catch (error) {
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

  const numPages = useMemo(
    () => Math.ceil(configuredServices.length / SERVICES_PER_PAGE),
    [configuredServices, SERVICES_PER_PAGE]
  );

  const pageServices = useMemo(
    () =>
      configuredServices.slice(
        page * SERVICES_PER_PAGE,
        (page + 1) * SERVICES_PER_PAGE
      ),
    [configuredServices, page]
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
      <Table className={styles.integrationsTable}>
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
              {/* Text-wrap because ellipsis menu popover will get hidden if `Table responsive`
              solution is used for mobile-friendly table
              https://stackoverflow.com/questions/6421966/css-overflow-x-visible-and-overflow-y-hidden-causing-scrollbar-issue */}
              <td className="text-wrap">
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

          {pageServices.map((configuredService) => {
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
                <td className="d-flex align-items-center">
                  <BrickIcon brick={service} size="1x" />
                  <div className="ml-2">
                    <div className="text-wrap">{service.name}</div>
                    <div className="text-wrap">
                      <code className="p-0" style={{ fontSize: "0.7rem" }}>
                        {service.id}
                      </code>
                    </div>
                  </div>
                </td>
                <td>
                  <EllipsisMenu
                    items={[
                      {
                        title: (
                          <>
                            <FontAwesomeIcon icon={faEdit} /> Configure
                          </>
                        ),
                        action: () => {
                          navigate(
                            `/services/${encodeURIComponent(
                              configuredService.id
                            )}`
                          );
                        },
                      },
                      {
                        title: (
                          <>
                            <FontAwesomeIcon icon={faSignOutAlt} /> Reset Token
                          </>
                        ),
                        action: async () => resetAuth(configuredService.id),
                        disabled: !service.isOAuth2 && !service.isToken,
                      },
                    ]}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <Card.Footer className="d-flex align-items-center justify-content-between">
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
        <span className="text-muted">
          Showing {page * SERVICES_PER_PAGE + 1} to{" "}
          {SERVICES_PER_PAGE * page + pageServices.length} of{" "}
          {configuredServices.length} integrations
        </span>
        {configuredServices.length > SERVICES_PER_PAGE && (
          <Pagination page={page} setPage={setPage} numPages={numPages} />
        )}
      </Card.Footer>
    </>
  );
};

export default PrivateServicesCard;
