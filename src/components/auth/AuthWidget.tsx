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
import ServiceAuthSelector from "@/components/ServiceAuthSelector";
import { type AuthOption } from "@/auth/authTypes";
import { useField } from "formik";
import { useDispatch } from "react-redux";
import { useAsyncState } from "@/hooks/common";
import registry from "@/services/registry";
import { uuidv4 } from "@/types/helpers";
import { services } from "@/background/messenger/api";
import { Button } from "react-bootstrap";
import IntegrationEditorModal from "@/extensionConsole/pages/integrations/IntegrationEditorModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSync } from "@fortawesome/free-solid-svg-icons";
import integrationsSlice from "@/store/integrations/integrationsSlice";
import notify from "@/utils/notify";
import createMenuListWithAddButton from "@/components/form/widgets/createMenuListWithAddButton";
import useAuthorizationGrantFlow from "@/hooks/useAuthorizationGrantFlow";
import styles from "./AuthWidget.module.scss";
import ReduxPersistenceContext from "@/store/ReduxPersistenceContext";
import { type RegistryId } from "@/types/registryTypes";
import { type UUID } from "@/types/stringTypes";
import { type IntegrationConfig } from "@/types/integrationTypes";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { sanitizeIntegrationConfig } from "@/services/sanitizeIntegrationConfig";
import { curry } from "lodash";

const { upsertIntegrationConfig } = integrationsSlice.actions;

const RefreshButton: React.VFC<{
  buttonText: string;
  onRefresh: () => void;
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
      <FontAwesomeIcon icon={faSync} /> {buttonText}
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

  authOptions: AuthOption[];

  /**
   * Callback to refresh the authOptions.
   */
  onRefresh: () => void;
}> = ({ name, integrationId, authOptions, onRefresh }) => {
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

      // Need to write the current Redux options to storage so the locator can read them during checks
      await flushReduxPersistence();

      // Also refresh the service locator on the background so the new auth works immediately
      await services.refresh({ remote: false, local: true });

      onRefresh();

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
    [
      dispatch,
      integrationId,
      flushReduxPersistence,
      onRefresh,
      helpers,
      sanitizeConfigArgs,
    ]
  );

  const launchAuthorizationGrantFlow = useAuthorizationGrantFlow();

  const onClickNew = useCallback(() => {
    if (serviceDefinition.isAuthorizationGrant) {
      void launchAuthorizationGrantFlow(serviceDefinition, {
        target: "_self",
      });
      return;
    }

    setShowServiceEditorModal(true);
    reportEvent(Events.AUTH_WIDGET_SHOW_ADD_NEW);
  }, [launchAuthorizationGrantFlow, serviceDefinition]);

  const CustomMenuList = useMemo(
    () => createMenuListWithAddButton(onClickNew),
    [onClickNew]
  );

  const initialConfiguration: IntegrationConfig = useMemo(
    () =>
      ({
        integrationId,
        label: "New Configuration",
        config: {},
      } as IntegrationConfig),
    [integrationId]
  );

  return (
    <>
      {showServiceEditorModal && (
        <IntegrationEditorModal
          integrationConfig={initialConfiguration}
          integration={serviceDefinition}
          onClose={() => {
            setShowServiceEditorModal(false);
            reportEvent(Events.AUTH_WIDGET_HIDE_ADD_NEW);
          }}
          onSave={save}
        />
      )}

      <div className="d-inline-flex justify-content-end">
        {options.length > 0 ? (
          <>
            <div className={styles.selector}>
              <ServiceAuthSelector
                name={name}
                serviceId={integrationId}
                authOptions={options}
                CustomMenuList={CustomMenuList}
                sanitizeConfigArgs={sanitizeConfigArgs}
              />
            </div>
            <div>
              {" "}
              <RefreshButton onRefresh={onRefresh} buttonText="Refresh" />
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
