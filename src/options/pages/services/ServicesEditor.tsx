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

import styles from "@/options/pages/services/PrivateServicesCard.module.scss";

import React, { useCallback, useState } from "react";
import { connect } from "react-redux";
import servicesSlice from "@/store/servicesSlice";
import Page from "@/layout/Page";
import { Card, Col, Row } from "react-bootstrap";
import { push } from "connected-react-router";
import ServiceEditorModal from "./ServiceEditorModal";
import PrivateServicesCard from "./PrivateServicesCard";
import ConnectExtensionCard from "./ConnectExtensionCard";
import { faCloud, faPlus } from "@fortawesome/free-solid-svg-icons";
import useServiceDefinitions from "./useServiceDefinitions";
import { persistor } from "@/options/store";
import { services } from "@/background/messenger/api";
import ZapierModal from "@/options/pages/services/ZapierModal";
import useNotifications from "@/hooks/useNotifications";
import { useParams } from "react-router";
import { IService, RawServiceConfiguration, UUID } from "@/core";
import BrickModal from "@/components/brickModal/BrickModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { uuidv4 } from "@/types/helpers";
import useAuthorizationGrantFlow from "@/hooks/useAuthorizationGrantFlow";

const { updateServiceConfig, deleteServiceConfig } = servicesSlice.actions;

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
  const notify = useNotifications();
  const { id: configurationId } = useParams<{ id: UUID }>();

  const [newConfigurationService, setNewConfigurationService] =
    useState<IService>(null);
  const [newConfiguration, setNewConfiguration] =
    useState<RawServiceConfiguration>(null);

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

  const launchAuthorizationGrantFlow = useAuthorizationGrantFlow();

  const handleCreate = useCallback(
    async (service: IService) => {
      const definition = (serviceDefinitions ?? []).find(
        (x) => x.id === service.id
      );

      if (definition.isAuthorizationGrant) {
        void launchAuthorizationGrantFlow(service, { target: "_self" });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- nominal tying
      const config = {
        id: uuidv4(),
        label: undefined,
        serviceId: service.id,
        config: {},
      } as RawServiceConfiguration;

      setNewConfiguration(config);
      setNewConfigurationService(definition);
      navigate(`/services/${encodeURIComponent(config.id)}`);
    },
    [
      navigate,
      launchAuthorizationGrantFlow,
      serviceDefinitions,
      setNewConfiguration,
      setNewConfigurationService,
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

  return (
    <Page
      icon={faCloud}
      title="Integrations"
      description="Configure external accounts, resources, and APIs. Personal integrations are
          stored in your browser; they are never transmitted to the PixieBrix servers or shared with your team"
      isPending={servicesPending}
      toolbar={
        <BrickModal
          onSelect={handleCreate}
          bricks={serviceDefinitions}
          modalClassName={styles.ModalOverride}
          selectCaption={
            <span>
              <FontAwesomeIcon icon={faPlus} className="mr-1" /> Configure
            </span>
          }
          caption={
            <span>
              <FontAwesomeIcon icon={faPlus} />
              &nbsp;Add Integration
            </span>
          }
        />
      }
    >
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
            <Card.Header>Personal Integrations</Card.Header>
            <PrivateServicesCard
              navigate={navigate}
              services={serviceDefinitions}
            />
          </Card>
        </Col>
      </Row>
    </Page>
  );
};

export default connect(null, {
  updateServiceConfig,
  deleteServiceConfig,
  navigate: push,
})(ServicesEditor);
