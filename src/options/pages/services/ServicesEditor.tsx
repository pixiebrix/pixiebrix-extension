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

import React, { useCallback, useState } from "react";
import { connect, useSelector } from "react-redux";
import { servicesSlice } from "../../slices";
import { PageTitle } from "@/layout/Page";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { push } from "connected-react-router";
import { useToasts } from "react-toast-notifications";
import ServiceEditorModal from "./ServiceEditorModal";
import PrivateServicesCard from "./PrivateServicesCard";
import ConnectExtensionCard from "./ConnectExtensionCard";
import SharedServicesCard from "./SharedServicesCard";
import { faCloud } from "@fortawesome/free-solid-svg-icons";
import Card from "react-bootstrap/Card";
import Nav from "react-bootstrap/Nav";
import Badge from "react-bootstrap/Badge";
import { useFetch } from "@/hooks/fetch";
import useServiceDefinitions from "./useServiceDefinitions";
import { RootState } from "../../store";
import { RawServiceConfiguration } from "@/core";
import { SanitizedAuth } from "@/types/contract";
import { refresh as refreshServices } from "@/background/locator";
import { GridLoader } from "react-spinners";

const { updateServiceConfig, deleteServiceConfig } = servicesSlice.actions;

interface OwnProps {
  updateServiceConfig: (config: RawServiceConfiguration) => void;
  deleteServiceConfig: ({ id }: { id: string }) => void;
  navigate: (url: string) => void;
}

const ServicesEditor: React.FunctionComponent<OwnProps> = ({
  updateServiceConfig,
  deleteServiceConfig,
  navigate,
}) => {
  const remoteAuths = useFetch<SanitizedAuth[]>("/api/services/shared/?meta=1");

  const configuredServices = useSelector<RootState, RawServiceConfiguration[]>(
    ({ services }) => Object.values(services.configured)
  );

  const [activeTab, setTab] = useState("private");

  const { addToast } = useToasts();

  const {
    activeConfiguration,
    serviceDefinitions,
    activeService,
    isPending: servicesPending,
  } = useServiceDefinitions();

  console.log("service state", {
    activeConfiguration,
    servicesPending,
    activeService,
    serviceDefinitions,
  });

  const handleSave = useCallback(
    async (config) => {
      updateServiceConfig(config);
      await refreshServices();
      addToast(`Updated your private configuration for ${activeService.name}`, {
        appearance: "success",
        autoDismiss: true,
      });
      navigate("/services");
    },
    [updateServiceConfig, activeService, addToast, navigate]
  );

  const handleDelete = useCallback(
    async (id) => {
      deleteServiceConfig({ id });
      await refreshServices();
      navigate("/services");
      addToast(`Deleted private configuration for ${activeService.name}`, {
        appearance: "success",
        autoDismiss: true,
      });
    },
    [deleteServiceConfig, navigate, addToast, activeService]
  );

  if (servicesPending) {
    return (
      <div>
        <PageTitle icon={faCloud} title="Configure Services" />
        <div className="pb-4">
          <p>
            Services are external accounts and resources that you configure and
            re-use across bricks
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
      <PageTitle icon={faCloud} title="Configure Services" />
      <div className="pb-4">
        <p>
          Services are external accounts and resources that you configure and
          re-use across bricks
        </p>
      </div>
      {activeConfiguration && activeService && (
        <ServiceEditorModal
          configuration={activeConfiguration}
          service={activeService}
          onDelete={handleDelete}
          onClose={() => navigate("/services")}
          onSave={handleSave}
        />
      )}
      <Row>
        <Col>
          <ConnectExtensionCard />
        </Col>
      </Row>
      <Row>
        <Col xl={8} lg={10} md={12}>
          <Card>
            <Card.Header>
              <Nav
                variant="tabs"
                defaultActiveKey={activeTab}
                onSelect={(x: string) => setTab(x)}
              >
                <Nav.Item>
                  <Nav.Link eventKey="private">
                    Private Services{" "}
                    <Badge variant="info">
                      {configuredServices ? configuredServices.length : "?"}
                    </Badge>
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="shared">
                    Shared Services{" "}
                    <Badge variant="info">
                      {remoteAuths ? remoteAuths.length : "?"}
                    </Badge>
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </Card.Header>

            {activeTab === "private" && (
              <PrivateServicesCard
                navigate={navigate}
                services={serviceDefinitions}
                onCreate={(config) => {
                  updateServiceConfig(config);
                  navigate(`/services/${encodeURIComponent(config.id)}`);
                }}
              />
            )}

            {activeTab === "shared" && (
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
