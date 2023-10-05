/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import styles from "@/extensionConsole/pages/integrations/PrivateIntegrationsCard.module.scss";

import React, { useCallback, useContext, useState } from "react";
import { connect } from "react-redux";
import integrationsSlice from "@/store/integrations/integrationsSlice";
import Page from "@/layout/Page";
import { Card, Col, Row } from "react-bootstrap";
import { push } from "connected-react-router";
import IntegrationEditorModal from "./IntegrationEditorModal";
import PrivateIntegrationsCard from "./PrivateIntegrationsCard";
import ConnectExtensionCard from "./ConnectExtensionCard";
import { faCloud, faPlus } from "@fortawesome/free-solid-svg-icons";
import useIntegrationDefinitions from "./useIntegrationDefinitions";
import { services } from "@/background/messenger/api";
import ZapierModal from "@/extensionConsole/pages/integrations/ZapierModal";
import notify from "@/utils/notify";
import { useParams } from "react-router";
import BrickModal from "@/components/brickModalNoTags/BrickModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { uuidv4 } from "@/types/helpers";
import useAuthorizationGrantFlow from "@/hooks/useAuthorizationGrantFlow";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import {
  type Integration,
  type IntegrationConfig,
} from "@/types/integrationTypes";
import { type UUID } from "@/types/stringTypes";
import ReduxPersistenceContext from "@/store/ReduxPersistenceContext";

const { upsertIntegrationConfig, deleteIntegrationConfig } =
  integrationsSlice.actions;

type OwnProps = {
  upsertIntegrationConfig: typeof upsertIntegrationConfig;
  deleteIntegrationConfig: typeof deleteIntegrationConfig;
  navigate: typeof push;
};

const IntegrationsPage: React.FunctionComponent<OwnProps> = ({
  upsertIntegrationConfig,
  deleteIntegrationConfig,
  navigate,
}) => {
  const { id: configurationId } = useParams<{ id: UUID }>();
  // Newly created integration (to ensure it's visible in the table)
  const [createdIntegration, setCreatedIntegration] =
    useState<Integration | null>(null);
  const [integrationToCreate, setIntegrationToCreate] =
    useState<Integration | null>(null);
  const [newIntegrationConfig, setNewIntegrationConfig] =
    useState<IntegrationConfig | null>(null);
  const { flush: flushReduxPersistence } = useContext(ReduxPersistenceContext);

  const {
    activeConfiguration,
    integrations,
    activeIntegration,
    showZapier,
    isPending: servicesPending,
  } = useIntegrationDefinitions();

  const isConfiguring = Boolean(
    configurationId &&
      ((integrationToCreate && newIntegrationConfig) ||
        (activeIntegration && activeConfiguration))
  );

  const handleSave = useCallback(
    async (config: IntegrationConfig) => {
      upsertIntegrationConfig(config);
      notify.success(
        `${
          integrationToCreate ? "Created" : "Updated"
        } private configuration for ${
          (activeIntegration ?? integrationToCreate)?.name
        }.`
      );

      setNewIntegrationConfig(null);
      setIntegrationToCreate(null);
      setCreatedIntegration(integrationToCreate);
      await flushReduxPersistence();

      try {
        await services.refresh();
      } catch (error) {
        notify.error({
          message:
            "Error refreshing integration configurations, restart the PixieBrix extension",
          error,
        });
      }

      navigate("/services");
    },
    [
      upsertIntegrationConfig,
      integrationToCreate,
      activeIntegration,
      flushReduxPersistence,
      navigate,
    ]
  );

  const launchAuthorizationGrantFlow = useAuthorizationGrantFlow();

  const handleCreate = useCallback(
    async (integration: Integration) => {
      reportEvent(Events.INTEGRATION_ADD, {
        serviceId: integration.id,
      });

      const definition = (integrations ?? []).find(
        (x) => x.id === integration.id
      );

      if (definition.isAuthorizationGrant) {
        void launchAuthorizationGrantFlow(integration, { target: "_self" });
        return;
      }

      const config = {
        id: uuidv4(),
        label: undefined,
        integrationId: integration.id,
        config: {},
      } as IntegrationConfig;

      setNewIntegrationConfig(config);
      setIntegrationToCreate(definition);
      navigate(`/services/${encodeURIComponent(config.id)}`);
    },
    [
      navigate,
      launchAuthorizationGrantFlow,
      integrations,
      setNewIntegrationConfig,
      setIntegrationToCreate,
    ]
  );

  const handleDelete = useCallback(
    async (id) => {
      deleteIntegrationConfig({ id });
      notify.success(
        `Deleted private configuration for ${activeIntegration?.name}`
      );
      navigate("/services/");

      await flushReduxPersistence();

      try {
        await services.refresh();
      } catch (error) {
        notify.error({
          message:
            "Error refreshing service configurations, restart the PixieBrix extension",
          error,
        });
      }
    },
    [
      deleteIntegrationConfig,
      activeIntegration?.name,
      navigate,
      flushReduxPersistence,
    ]
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
          bricks={integrations}
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
        <IntegrationEditorModal
          integrationConfig={activeConfiguration ?? newIntegrationConfig}
          integration={activeIntegration ?? integrationToCreate}
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
            <PrivateIntegrationsCard
              navigate={navigate}
              integrations={integrations}
              initialIntegration={createdIntegration}
            />
          </Card>
        </Col>
      </Row>
    </Page>
  );
};

export default connect(null, {
  upsertIntegrationConfig,
  deleteIntegrationConfig,
  navigate: push,
})(IntegrationsPage);
