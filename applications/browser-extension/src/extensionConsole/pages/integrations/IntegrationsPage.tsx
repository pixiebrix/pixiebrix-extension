/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import styles from "./PrivateIntegrationsCard.module.scss";

import React, { useCallback, useContext, useEffect, useReducer } from "react";
import { useDispatch, useSelector } from "react-redux";
import integrationsSlice from "../../../integrations/store/integrationsSlice";
import Page from "../../../layout/Page";
import { Card } from "react-bootstrap";
import { push } from "connected-react-router";
import IntegrationConfigEditorModal from "@/components/integrations/IntegrationConfigEditorModal";
import PrivateIntegrationsCard from "./PrivateIntegrationsCard";
import ConnectExtensionCard from "./ConnectExtensionCard";
import { faCloud, faPlus } from "@fortawesome/free-solid-svg-icons";
import { integrationConfigLocator } from "@/background/messenger/api";
import ZapierIntegrationModal from "./ZapierIntegrationModal";
import notify from "../../../utils/notify";
import { useLocation } from "react-router";
import PackageSearchModal from "@/components/packageSearchModal/PackageSearchModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { isUUID, uuidv4 } from "../../../types/helpers";
import useAuthorizationGrantFlow from "@/hooks/useAuthorizationGrantFlow";
import reportEvent from "../../../telemetry/reportEvent";
import { Events } from "../../../telemetry/events";
import {
  type Integration,
  type IntegrationConfig,
} from "../../../integrations/integrationTypes";
import { type SafeString, type UUID } from "../../../types/stringTypes";
import ReduxPersistenceContext from "../../../store/ReduxPersistenceContext";
import {
  type AnyAction,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import registry from "../../../integrations/registry";
import { isEmpty, isEqual, sortBy } from "lodash";
import { selectIntegrationConfigs } from "../../../integrations/store/integrationsSelectors";
import useAsyncEffect from "use-async-effect";
import { type RegistryId } from "../../../types/registryTypes";
import { freshIdentifier } from "../../../utils/variableUtils";
import { PIXIEBRIX_INTEGRATION_ID } from "../../../integrations/constants";
import {
  autoConfigurations,
  autoConfigureIntegration,
} from "../../../integrations/autoConfigure";
import { type Draft } from "immer";

const { upsertIntegrationConfig, deleteIntegrationConfig } =
  integrationsSlice.actions;

type URLParamValue = UUID | "zapier" | "new" | undefined;

function validateUrlParamValue(value: string): URLParamValue {
  if (isUUID(value) || value === "zapier" || value === "new") {
    return value as URLParamValue;
  }

  return undefined;
}

type State = {
  /**
   * The form state value for the IntegrationConfigEditorModal, if a config is currently being edited
   */
  editingIntegrationConfig: IntegrationConfig | null;
  /**
   * Whether we are showing the Zapier integration key info modal
   */
  showZapier: boolean;
  /**
   * Whether we are loading integrations from the registry
   */
  isLoadingIntegrations: boolean;
  /**
   * Integrations loaded from the registry
   */
  integrations: Integration[];
  /**
   * The selected integration for the config being edited in the IntegrationConfigEditorModal
   */
  selectedIntegration: Integration | null;
  /**
   * Whether the IntegrationConfigEditorModal is creating a new integration or editing an existing one
   */
  isCreateNew: boolean;
  /**
   * The id of the integration config that was just created. This is used to guide the paginated
   * table to ensure this item is showing.
   */
  createdIntegrationConfigId: UUID | null;

  urlPathParam?: URLParamValue;
  integrationConfigs: IntegrationConfig[];
};

const initialState: State = {
  editingIntegrationConfig: null,
  showZapier: false,
  isLoadingIntegrations: true,
  integrations: [],
  selectedIntegration: null,
  isCreateNew: false,
  createdIntegrationConfigId: null,
  integrationConfigs: [],
};

const componentState = createSlice({
  name: "integrationsPageState",
  initialState,
  reducers: {
    urlParamOrConfigsChanged(
      state,
      action: PayloadAction<{
        urlParam: URLParamValue;
        integrationConfigs: IntegrationConfig[];
      }>,
    ) {
      const { urlParam, integrationConfigs } = action.payload;

      if (
        urlParam === state.urlPathParam &&
        isEqual(integrationConfigs, state.integrationConfigs)
      ) {
        return;
      }

      state.urlPathParam = urlParam;
      state.integrationConfigs = integrationConfigs;

      if (urlParam === "zapier") {
        state.showZapier = true;
        return;
      }

      const integrationConfigId = isUUID(urlParam) ? urlParam : null;

      if (integrationConfigId) {
        const integrationConfig = integrationConfigs.find(
          ({ id }) => id === integrationConfigId,
        );
        if (!integrationConfig) {
          throw new Error(`Unknown integration config ${integrationConfigId}`);
        }

        state.editingIntegrationConfig = integrationConfig;
        state.createdIntegrationConfigId = null;

        if (state.isLoadingIntegrations || isEmpty(state.integrations)) {
          return;
        }

        const selectedIntegration = state.integrations.find(
          ({ id }) => id === integrationConfig.integrationId,
        );
        if (!selectedIntegration) {
          throw new Error(
            `Unknown integration on config ${integrationConfig.integrationId}`,
          );
        }

        state.selectedIntegration = selectedIntegration;
      } else if (urlParam === "new") {
        const { selectedIntegration } = state;
        if (!selectedIntegration) {
          throw new Error(
            "Cannot create a new config without a selected integration",
          );
        }

        state.editingIntegrationConfig = {
          id: uuidv4(),
          label: "",
          integrationId: selectedIntegration.id,
          config: {},
        } as IntegrationConfig;
        state.isCreateNew = true;
        state.createdIntegrationConfigId = null;
      } else {
        state.showZapier = false;
        state.editingIntegrationConfig = null;
        state.selectedIntegration = null;
        state.isCreateNew = false;
      }
    },
    integrationsLoaded(state, action: PayloadAction<Integration[]>) {
      state.isLoadingIntegrations = false;
      const integrations = action.payload as Draft<Integration[]>;
      if (state.editingIntegrationConfig && isEmpty(state.integrations)) {
        const selectedIntegration = integrations.find(
          ({ id }) => id === state.editingIntegrationConfig?.integrationId,
        );
        if (!selectedIntegration) {
          throw new Error(
            `Unknown integration ${state.editingIntegrationConfig.integrationId}`,
          );
        }

        state.selectedIntegration = selectedIntegration;
      }

      state.integrations = integrations;
    },
    selectIntegrationById(state, action: PayloadAction<RegistryId>) {
      if (state.isLoadingIntegrations || isEmpty(state.integrations)) {
        return;
      }

      const integrationId = action.payload;
      const selectedIntegration = state.integrations.find(
        ({ id }) => id === integrationId,
      );
      if (!selectedIntegration) {
        throw new Error(`Unknown integration ${integrationId}`);
      }

      state.selectedIntegration = selectedIntegration;
    },
    saveIntegrationConfig(state, action: PayloadAction<IntegrationConfig>) {
      if (state.isCreateNew) {
        state.createdIntegrationConfigId = action.payload.id;
      } else {
        state.createdIntegrationConfigId = null;
      }

      state.editingIntegrationConfig = null;
      state.selectedIntegration = null;
      state.isCreateNew = false;
    },
    onDeleteIntegrationConfig(state) {
      state.editingIntegrationConfig = null;
      state.selectedIntegration = null;
      state.createdIntegrationConfigId = null;
    },
    onAutoConfigureIntegrationConfig(
      state,
      action: PayloadAction<IntegrationConfig>,
    ) {
      state.createdIntegrationConfigId = action.payload.id;
      state.editingIntegrationConfig = null;
      state.selectedIntegration = null;
    },
  },
});

function useUrlOrConfigsChangeHandler(
  dispatch: React.Dispatch<AnyAction>,
  integrationConfigs: IntegrationConfig[],
) {
  let { pathname } = useLocation();
  if (pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }

  const urlParam = validateUrlParamValue(pathname.split("/").pop() ?? "");
  useEffect(() => {
    dispatch(
      componentState.actions.urlParamOrConfigsChanged({
        urlParam,
        integrationConfigs,
      }),
    );
  }, [dispatch, integrationConfigs, urlParam]);
}

const IntegrationsPage: React.VFC = () => {
  const { flush: flushReduxPersistence } = useContext(ReduxPersistenceContext);
  const launchAuthorizationGrantFlow = useAuthorizationGrantFlow();

  const reduxDispatch = useDispatch();
  const navigate = useCallback(
    (route: string) => {
      reduxDispatch(push(route));
    },
    [reduxDispatch],
  );

  const [localState, localDispatch] = useReducer(
    componentState.reducer,
    initialState,
  );

  // Load integration definitions from the registry on mount
  useAsyncEffect(async (isMounted) => {
    const fetched = await registry.all();
    const integrations = sortBy(
      fetched.filter(({ id }) => id !== PIXIEBRIX_INTEGRATION_ID),
      "id",
    );

    if (!isMounted()) {
      return;
    }

    localDispatch(componentState.actions.integrationsLoaded(integrations));
  }, []);

  const integrationConfigs = useSelector(selectIntegrationConfigs);

  useUrlOrConfigsChangeHandler(localDispatch, integrationConfigs);

  const syncIntegrations = useCallback(async () => {
    await flushReduxPersistence();
    try {
      await integrationConfigLocator.refresh();
    } catch (error) {
      notify.error({
        message:
          "Error refreshing integration configurations, restart the PixieBrix extension",
        error,
      });
    }
  }, [flushReduxPersistence]);

  const onSelectIntegrationForNewConfig = useCallback(
    (integration: Integration) => {
      // TODO: This is possibly being reported in the wrong place? Should this be when a new config is SAVED instead?
      reportEvent(Events.INTEGRATION_ADD, {
        integrationId: integration.id,
      });

      if (integration.isAuthorizationGrant) {
        void launchAuthorizationGrantFlow(integration, { target: "_self" });
        return;
      }

      if (integration.id in autoConfigurations) {
        const label = freshIdentifier(
          `${integration.name} Config` as SafeString,
          integrationConfigs.map(({ label }) => label),
        );
        void autoConfigureIntegration(integration, label, {
          upsertIntegrationConfig(config: IntegrationConfig) {
            reduxDispatch(upsertIntegrationConfig(config));
            localDispatch(
              componentState.actions.onAutoConfigureIntegrationConfig(config),
            );
          },
          deleteIntegrationConfig(id: UUID) {
            reduxDispatch(deleteIntegrationConfig({ id }));
            localDispatch(componentState.actions.onDeleteIntegrationConfig());
          },
          syncIntegrations,
        });
        return;
      }

      localDispatch(
        componentState.actions.selectIntegrationById(integration.id),
      );
      navigate("/services/new");
    },
    [
      integrationConfigs,
      launchAuthorizationGrantFlow,
      navigate,
      reduxDispatch,
      syncIntegrations,
    ],
  );

  const onSaveIntegrationConfig = useCallback(
    async (newIntegrationConfig: IntegrationConfig) => {
      reduxDispatch(upsertIntegrationConfig(newIntegrationConfig));
      localDispatch(
        componentState.actions.saveIntegrationConfig(newIntegrationConfig),
      );
      const verbed = localState.isCreateNew ? "Created" : "Updated";
      notify.success(
        `${verbed} private configuration for ${localState.selectedIntegration?.name}.`,
      );
      await syncIntegrations();
    },
    [
      localState.isCreateNew,
      localState.selectedIntegration?.name,
      reduxDispatch,
      syncIntegrations,
    ],
  );

  const onDeleteIntegrationConfig = useCallback(
    async (id: UUID) => {
      navigate("/services/");
      reduxDispatch(deleteIntegrationConfig({ id }));
      localDispatch(componentState.actions.onDeleteIntegrationConfig());
      notify.success(
        `Deleted private configuration for ${localState.selectedIntegration?.name}`,
      );
      await syncIntegrations();
    },
    [
      localState.selectedIntegration?.name,
      navigate,
      reduxDispatch,
      syncIntegrations,
    ],
  );

  return (
    <Page
      icon={faCloud}
      title="Local Integrations"
      description="Configure external accounts, resources, and APIs. Local integrations are
          stored in your browser; they are never transmitted to the PixieBrix servers or shared with your team"
      isPending={localState.isLoadingIntegrations}
      documentationUrl="https://docs.pixiebrix.com/integrations/configuring-integrations"
      toolbar={
        <PackageSearchModal
          onSelect={onSelectIntegrationForNewConfig}
          packageInstances={localState.integrations}
          modalClassName={styles.ModalOverride}
          selectCaption={
            <span>
              <FontAwesomeIcon icon={faPlus} className="mr-1" /> Configure
            </span>
          }
          caption={
            <span>
              <FontAwesomeIcon icon={faPlus} />
              &nbsp;Add Local Integration
            </span>
          }
        />
      }
    >
      <ZapierIntegrationModal
        show={localState.showZapier}
        onClose={() => {
          navigate("/services");
        }}
      />
      <IntegrationConfigEditorModal
        integration={localState.selectedIntegration}
        initialValues={localState.editingIntegrationConfig}
        onSave={onSaveIntegrationConfig}
        onClose={() => {
          navigate("/services");
        }}
        onDelete={
          localState.isCreateNew ? undefined : onDeleteIntegrationConfig
        }
      />
      <ConnectExtensionCard />
      <Card>
        <Card.Header>Local Integrations</Card.Header>
        <PrivateIntegrationsCard
          navigate={navigate}
          integrations={localState.integrations}
          forceShowIntegrationConfigId={localState.createdIntegrationConfigId}
        />
      </Card>
    </Page>
  );
};

export default IntegrationsPage;
