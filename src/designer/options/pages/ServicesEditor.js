import React, { useMemo, useCallback } from "react";
import { connect, useSelector } from "react-redux";
import { servicesSlice } from "@/designer/options/slices";
import registry from "@/services/registry";
import { PageTitle } from "@/designer/options/layout/Page";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { push } from "connected-react-router";
import { useToasts } from "react-toast-notifications";
import { useParams } from "react-router";
import sortBy from "lodash/sortBy";
import ServiceEditorModal from "@/designer/options/pages/services/ServiceEditorModal";
import PrivateServicesCard from "@/designer/options/pages/services/PrivateServicesCard";
import ConnectExtensionCard from "@/designer/options/pages/services/ConnectExtensionCard";
import SharedServicesCard from "@/designer/options/pages/services/SharedServicesCard";
import { faCloud } from "@fortawesome/free-solid-svg-icons";

const { updateServiceConfig, deleteServiceConfig } = servicesSlice.actions;

function useServiceDefinitions() {
  const configuredServices = useSelector(({ services }) =>
    Object.values(services.configured)
  );
  const { id: configurationId } = useParams();

  const serviceDefinitions = useMemo(
    () =>
      sortBy(
        registry.all().filter((x) => x.id !== "pixiebrix"),
        (x) => x.id
      ),
    []
  );

  const activeConfiguration = useMemo(() => {
    return configurationId
      ? configuredServices.find((x) => x.id === configurationId)
      : null;
  }, [configuredServices, configurationId]);

  const activeService = useMemo(() => {
    return activeConfiguration
      ? serviceDefinitions.find((x) => x.id === activeConfiguration.serviceId)
      : null;
  }, [activeConfiguration, serviceDefinitions]);

  return { serviceDefinitions, activeConfiguration, activeService };
}

const ServicesEditor = ({
  updateServiceConfig,
  deleteServiceConfig,
  navigate,
}) => {
  const { addToast } = useToasts();
  const {
    serviceDefinitions,
    activeConfiguration,
    activeService,
  } = useServiceDefinitions();

  const handleSave = useCallback(
    (config) => {
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
          re-use across brix
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
        <Col>
          <PrivateServicesCard
            navigate={navigate}
            services={serviceDefinitions}
            onCreate={(config) => {
              updateServiceConfig(config);
              navigate(`/services/${encodeURIComponent(config.id)}`);
            }}
          />
        </Col>
      </Row>
      <Row>
        <Col>
          <SharedServicesCard className="mt-3" />
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
