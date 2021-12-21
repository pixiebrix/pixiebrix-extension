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

import React, { useCallback, useContext, useState } from "react";
import { connect, useSelector } from "react-redux";
import { servicesSlice, ServicesState } from "@/options/slices";
import { PageTitle } from "@/layout/Page";
import { Badge, Card, Col, Nav, Row } from "react-bootstrap";
import { push } from "connected-react-router";
import ServiceEditorModal from "./ServiceEditorModal";
import PrivateServicesCard from "./PrivateServicesCard";
import ConnectExtensionCard from "./ConnectExtensionCard";
import SharedServicesCard from "./SharedServicesCard";
import { faCloud } from "@fortawesome/free-solid-svg-icons";
import useServiceDefinitions from "./useServiceDefinitions";
import { persistor, RootState } from "@/options/store";
import { SanitizedAuth } from "@/types/contract";
import { services } from "@/background/messenger/api";
import GridLoader from "react-spinners/GridLoader";
import ZapierModal from "@/options/pages/services/ZapierModal";
import AuthContext from "@/auth/AuthContext";
import { useTitle } from "@/hooks/title";
import useFetch from "@/hooks/useFetch";
import useNotifications from "@/hooks/useNotifications";
import { useParams } from "react-router";
import { IService, RawServiceConfiguration, UUID } from "@/core";

const { updateServiceConfig, deleteServiceConfig } = servicesSlice.actions;

const selectConfiguredServices = ({ services }: { services: ServicesState }) =>
  Object.values(services.configured);

type OwnProps = {
  updateServiceConfig: typeof updateServiceConfig;
  deleteServiceConfig: typeof deleteServiceConfig;
  navigate: typeof push;
};

const ServicesEditor: React.FunctionComponent<OwnProps> = ({
  updateServiceConfig,
  deleteServiceConfig,
  navigate,
}) => {
  useTitle("Integrations");

  const { data: remoteAuths } = useFetch<SanitizedAuth[]>(
    "/api/services/shared/?meta=1"
  );
  const { flags } = useContext(AuthContext);

  const configuredServices = useSelector<RootState, RawServiceConfiguration[]>(
    selectConfiguredServices
  );

  const { id: configurationId } = useParams<{ id: UUID }>();

  const [
    newConfigurationService,
    setNewConfigurationService,
  ] = useState<IService>(null);
  const [
    newConfiguration,
    setNewConfiguration,
  ] = useState<RawServiceConfiguration>(null);

  const [activeTab, setTab] = useState("private");

  const notify = useNotifications();

  const {
    activeConfiguration,
    serviceDefinitions,
    activeService,
    showZapier,
    isPending: servicesPending,
  } = useServiceDefinitions();

  const isConfiguring =
    configurationId &&
    ((newConfigurationService && newConfiguration) ||
      (activeService && activeConfiguration));

  const handleSave = useCallback(
    async (config) => {
      updateServiceConfig(config);
      notify.success(
        `${
          newConfigurationService ? "Created" : "Updated"
        } private configuration for ${
          (activeService ?? newConfigurationService)?.name
        }.`
      );

      setNewConfiguration(null);
      setNewConfigurationService(null);

      await persistor.flush();

      try {
        await services.refresh();
      } catch (error) {
        notify.warning(
          "Error refreshing service configurations, restart the PixieBrix extension",
          {
            error,
          }
        );
      }

      navigate("/services");
    },
    [
      updateServiceConfig,
      notify,
      activeService,
      newConfigurationService,
      navigate,
    ]
  );

  const handleDelete = useCallback(
    async (id) => {
      deleteServiceConfig({ id });
      notify.success(`Deleted private configuration for ${activeService.name}`);

      await persistor.flush();

      try {
        await services.refresh();
      } catch (error) {
        notify.warning(
          "Error refreshing service configurations, restart the PixieBrix extension",
          {
            error,
          }
        );
      }

      navigate("/services");
    },
    [deleteServiceConfig, navigate, notify, activeService]
  );

  if (servicesPending) {
    return (
      <div>
        <PageTitle icon={faCloud} title="Integrations" />
        <div className="pb-4">
          <p>
            Configure external accounts, resources, and APIs that you can re-use
            across bricks
          </p>
        </div>
        <Row>
          <Col>
            <GridLoader />
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div>
      <PageTitle icon={faCloud} title="Integrations" />
      <div className="pb-4">
        <p>
          Configure external accounts, resources, and APIs that you can re-use
          across bricks
        </p>
      </div>
      {showZapier && (
        <ZapierModal
          onClose={() => {
            navigate("/services");
          }}
        />
      )}
      {isConfiguring && (
        <ServiceEditorModal
          configuration={activeConfiguration ?? newConfiguration}
          service={activeService ?? newConfigurationService}
          onDelete={activeConfiguration && handleDelete}
          onClose={() => {
            navigate("/services");
          }}
          onSave={handleSave}
        />
      )}
      <Row>
        <Col>
          <ConnectExtensionCard />
        </Col>
      </Row>
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <Nav
                variant="tabs"
                defaultActiveKey={activeTab}
                onSelect={(x: string) => {
                  setTab(x);
                }}
              >
                <Nav.Item>
                  <Nav.Link eventKey="private">
                    Private Integrations{" "}
                    <Badge variant="info">
                      {configuredServices ? configuredServices.length : "?"}
                    </Badge>
                  </Nav.Link>
                </Nav.Item>
                {flags.includes("teams") && (
                  <Nav.Item>
                    <Nav.Link eventKey="shared">
                      Shared Integrations{" "}
                      <Badge variant="info">
                        {remoteAuths ? remoteAuths.length : "?"}
                      </Badge>
                    </Nav.Link>
                  </Nav.Item>
                )}
              </Nav>
            </Card.Header>

            {activeTab === "private" && (
              <PrivateServicesCard
                navigate={navigate}
                services={serviceDefinitions}
                onCreate={(config) => {
                  setNewConfiguration(config);
                  setNewConfigurationService(
                    (serviceDefinitions ?? []).find(
                      (x) => x.id === config.serviceId
                    )
                  );
                  navigate(`/services/${encodeURIComponent(config.id)}`);
                }}
              />
            )}

            {flags.includes("teams") && activeTab === "shared" && (
              <SharedServicesCard remoteAuths={remoteAuths} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default connect(null, {
  updateServiceConfig,
  deleteServiceConfig,
  navigate: push,
})(ServicesEditor);
