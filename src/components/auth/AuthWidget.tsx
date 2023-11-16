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

import React, { useCallback, useContext, useMemo, useState } from "react";
import IntegrationAuthSelector from "@/integrations/components/IntegrationAuthSelector";
import { type AuthOption } from "@/auth/authTypes";
import { useField } from "formik";
import { useDispatch, useSelector } from "react-redux";
import { useAsyncState } from "@/hooks/common";
import registry from "@/integrations/registry";
import { uuidv4 } from "@/types/helpers";
import { services } from "@/background/messenger/api";
import { Button } from "react-bootstrap";
import IntegrationConfigEditorModal from "@/extensionConsole/pages/integrations/IntegrationConfigEditorModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSync } from "@fortawesome/free-solid-svg-icons";
import integrationsSlice from "@/integrations/store/integrationsSlice";
import notify from "@/utils/notify";
import createMenuListWithAddButton from "@/components/form/widgets/createMenuListWithAddButton";
import useAuthorizationGrantFlow from "@/hooks/useAuthorizationGrantFlow";
import styles from "./AuthWidget.module.scss";
import ReduxPersistenceContext from "@/store/ReduxPersistenceContext";
import { type RegistryId } from "@/types/registryTypes";
import { type SafeString, type UUID } from "@/types/stringTypes";
import { type IntegrationConfig } from "@/integrations/integrationTypes";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { sanitizeIntegrationConfig } from "@/integrations/sanitizeIntegrationConfig";
import { curry } from "lodash";
import {
  autoConfigurations,
  autoConfigureIntegration,
} from "@/integrations/autoConfigure";
import { freshIdentifier } from "@/utils/variableUtils";
import { selectIntegrationConfigs } from "@/integrations/store/integrationsSelectors";

const { upsertIntegrationConfig, deleteIntegrationConfig } =
  integrationsSlice.actions;

const RefreshButton: React.VFC<{
  onRefresh: () => void;
  buttonText?: string;
}> = ({ buttonText = "", onRefresh }) => {
  const refreshAuthOptions = () => {
    // `onRefresh` is not awaitable. Indicate that clicking the button did something
    notify.info("Refreshing integration configurations");
    onRefresh();
  };

  return (
    <Button
      size="sm"
      variant="info"
      className={styles.actionButton}
      onClick={() => {
        refreshAuthOptions();
        reportEvent(Events.AUTH_WIDGET_REFRESH);
      }}
      title="Refresh integration configurations"
    >
      <FontAwesomeIcon icon={faSync} />
      {buttonText ? ` ${buttonText}` : ""}
    </Button>
  );
};

const AuthWidget: React.FunctionComponent<{
  /**
   * The field name. WARNING: do not use `serviceId`s as part of a field name because they can contain periods which
   * break Formik's nested field naming.
   */
  name: string;

  integrationId: RegistryId;

  isOptional?: boolean;

  authOptions: AuthOption[];

  /**
   * Callback to refresh the authOptions.
   */
  onRefresh: () => void;
}> = ({ name, integrationId, isOptional, authOptions, onRefresh }) => {
  const helpers = useField<UUID>(name)[2];
  const dispatch = useDispatch();

  const [showServiceEditorModal, setShowServiceEditorModal] = useState(false);

  const [serviceDefinition, isFetching, error] = useAsyncState(async () => {
    const serviceDefinitions = await registry.all();
    return serviceDefinitions.find(({ id }) => id === integrationId);
  }, [integrationId]);

  const sanitizeConfigArgs = curry(sanitizeIntegrationConfig)(
    serviceDefinition
  );

  const options = useMemo(
    () => authOptions.filter((x) => x.serviceId === integrationId),
    [authOptions, integrationId]
  );

  const { flush: flushReduxPersistence } = useContext(ReduxPersistenceContext);

  const syncIntegrations = useCallback(async () => {
    // Need to write the current Redux options to storage so the locator can read them during checks
    await flushReduxPersistence();
    try {
      // Also refresh the service locator on the background so the new auth works immediately
      await services.refresh({ remote: false, local: true });
    } catch (error) {
      notify.error({
        message:
          "Error refreshing integration configurations, restart the PixieBrix extension",
        error,
      });
    }

    onRefresh();
  }, [flushReduxPersistence, onRefresh]);

  const save = useCallback(
    async (values: IntegrationConfig) => {
      const id = uuidv4();

      dispatch(
        upsertIntegrationConfig({
          ...values,
          integrationId,
          id,
        })
      );

      await syncIntegrations();

      notify.success("Added configuration for integration");

      // Don't need to track changes locally via setCreated; the new auth automatically flows
      // through via the redux selectors

      await helpers.setValue(id);

      reportEvent(Events.AUTH_WIDGET_SELECT, {
        integration_id: integrationId,
        is_user_action: true,
        is_create: true,
        auth_label: values.label,
        auth_sharing_type: "private",
        auth_is_local: true,
        ...sanitizeConfigArgs(values.config),
      });

      // The IntegrationEditorModal will call the onClose function after
      // calling onSave, so we don't need to close anything manually here.
    },
    [dispatch, integrationId, syncIntegrations, helpers, sanitizeConfigArgs]
  );

  const launchAuthorizationGrantFlow = useAuthorizationGrantFlow();
  const integrationConfigs = useSelector(selectIntegrationConfigs);

  const onClickNew = useCallback(() => {
    if (serviceDefinition.isAuthorizationGrant) {
      void launchAuthorizationGrantFlow(serviceDefinition, {
        target: "_self",
      });
      return;
    }

    if (integrationId in autoConfigurations) {
      const label = freshIdentifier(
        `${serviceDefinition.name} Config` as SafeString,
        integrationConfigs.map(({ label }) => label)
      );
      void autoConfigureIntegration(serviceDefinition, label, {
        upsertIntegrationConfig(config: IntegrationConfig) {
          dispatch(upsertIntegrationConfig(config));
          void helpers.setValue(config.id);
          reportEvent(Events.AUTH_WIDGET_SELECT, {
            integration_id: config.integrationId,
            is_user_action: true,
            is_create: true,
            auth_label: config.label,
            auth_sharing_type: "private",
            auth_is_local: true,
            ...sanitizeConfigArgs(config.config),
          });
        },
        deleteIntegrationConfig(id: UUID) {
          dispatch(deleteIntegrationConfig({ id }));
        },
        syncIntegrations,
      });
      return;
    }

    setShowServiceEditorModal(true);
    reportEvent(Events.AUTH_WIDGET_SHOW_ADD_NEW);
  }, [
    dispatch,
    helpers,
    integrationConfigs,
    integrationId,
    launchAuthorizationGrantFlow,
    sanitizeConfigArgs,
    serviceDefinition,
    syncIntegrations,
  ]);

  const CustomMenuList = useMemo(
    () => createMenuListWithAddButton(onClickNew),
    [onClickNew]
  );

  const initialConfiguration = useMemo<IntegrationConfig | null>(
    () =>
      showServiceEditorModal
        ? ({
            integrationId,
            label: "New Configuration",
            config: {},
          } as IntegrationConfig)
        : null,
    [integrationId, showServiceEditorModal]
  );

  return (
    <>
      <IntegrationConfigEditorModal
        initialValues={initialConfiguration}
        integration={serviceDefinition}
        onClose={() => {
          setShowServiceEditorModal(false);
          reportEvent(Events.AUTH_WIDGET_HIDE_ADD_NEW);
        }}
        onSave={save}
      />

      <div className="d-inline-flex justify-content-end">
        {options.length > 0 ? (
          <>
            <div className={styles.selector}>
              <IntegrationAuthSelector
                name={name}
                serviceId={integrationId}
                isOptional={isOptional}
                authOptions={options}
                CustomMenuList={CustomMenuList}
                sanitizeConfigArgs={sanitizeConfigArgs}
              />
            </div>
            <div>
              {" "}
              <RefreshButton onRefresh={onRefresh} />
            </div>
          </>
        ) : (
          <>
            <Button
              variant="info"
              size="sm"
              className={styles.actionButton}
              onClick={onClickNew}
              disabled={isFetching || error != null}
            >
              <FontAwesomeIcon icon={faPlus} /> Configure
            </Button>
            <RefreshButton onRefresh={onRefresh} buttonText="Refresh" />
          </>
        )}
      </div>
    </>
  );
};

export default AuthWidget;
