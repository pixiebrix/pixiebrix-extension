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
import SharedServicesCard, { SanitizedAuth } from "./SharedServicesCard";
import { faCloud } from "@fortawesome/free-solid-svg-icons";
import Card from "react-bootstrap/Card";
import Nav from "react-bootstrap/Nav";
import Badge from "react-bootstrap/Badge";
import { useFetch } from "@/hooks/fetch";
import useServiceDefinitions from "./useServiceDefinitions";
import { RootState } from "../../store";
import { RawServiceConfiguration } from "@/core";

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
    serviceDefinitions,
    activeConfiguration,
    activeService,
  } = useServiceDefinitions();

  const handleSave = useCallback(
    async (config) => {
      updateServiceConfig(config);
      addToast(`Updated your private configuration for ${activeService.name}`, {
        appearance: "success",
        autoDismiss: true,
      });
      navigate("/services");
    },
    [updateServiceConfig, activeService, addToast, navigate]
  );

  const handleDelete = useCallback(
    (id) => {
      deleteServiceConfig({ id });
      navigate("/services");
      addToast(`Deleted private configuration for ${activeService.name}`, {
        appearance: "success",
        autoDismiss: true,
      });
    },
    [deleteServiceConfig, navigate, addToast, activeService]
  );

  return (
    <div>
      <PageTitle icon={faCloud} title="Configure Services" />
      <div className="pb-4">
        <p>
          Services are external accounts and resources that you configure and
          re-use across bricks
        </p>
      </div>
      {activeConfiguration && (
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
