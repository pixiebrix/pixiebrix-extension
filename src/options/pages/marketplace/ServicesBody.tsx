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

import React, { ComponentType, useCallback, useMemo, useState } from "react";
import ServiceAuthSelector, {
  AuthOption,
  useAuthOptions,
} from "@/options/pages/extensionEditor/ServiceAuthSelector";
import { uniq } from "lodash";
import { v4 as uuidv4 } from "uuid";
import { Button, Card, Table } from "react-bootstrap";
import { Link } from "react-router-dom";
import { RecipeDefinition, ServiceDefinition } from "@/types/definitions";
import { useSelectedExtensions } from "@/options/pages/marketplace/ConfigureBody";
import {
  faCloud,
  faInfoCircle,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useFetch } from "@/hooks/fetch";
import ServiceEditorModal from "@/options/pages/services/ServiceEditorModal";
import { useAsyncState } from "@/hooks/common";
import registry, { PIXIEBRIX_SERVICE_ID } from "@/services/registry";
import { RawServiceConfiguration } from "@/core";
import { servicesSlice } from "@/options/slices";
import { useDispatch } from "react-redux";
import { useToasts } from "react-toast-notifications";
import { useField } from "formik";
import { persistor } from "@/options/store";
import { refresh as refreshBackgroundLocator } from "@/background/locator";
import { GroupTypeBase, MenuListComponentProps } from "react-select";

const { updateServiceConfig } = servicesSlice.actions;

interface OwnProps {
  blueprint: RecipeDefinition;
}

const AuthWidget: React.FunctionComponent<{
  authOptions: AuthOption[];
  serviceId: string;
}> = ({ serviceId, authOptions }) => {
  const helpers = useField(`services.${serviceId}`)[2];
  const dispatch = useDispatch();
  const { addToast } = useToasts();

  const [showModal, setShow] = useState(false);

  const [serviceDefinition, isPending, error] = useAsyncState(
    async () => (await registry.all()).find((x) => x.id === serviceId),
    [serviceId]
  );

  const options = useMemo(
    () => authOptions.filter((x) => x.serviceId === serviceId),
    [authOptions, serviceId]
  );

  const save = useCallback(
    async (values: RawServiceConfiguration) => {
      const id = uuidv4();

      dispatch(
        updateServiceConfig({
          ...values,
          serviceId,
          id,
        })
      );

      // Need to write the current options to storage so the locator can read them during checks
      await persistor.flush();

      // Also refresh the service locator on the background so the new auth works immediately
      await refreshBackgroundLocator({ remote: false, local: true });

      addToast(`Added configuration for integration`, {
        appearance: "success",
        autoDismiss: true,
      });

      // Don't need to track changes locally via setCreated; the new auth automatically flows
      // through via the redux selectors

      helpers.setValue(id);

      setShow(false);
    },
    [helpers, addToast, dispatch, setShow, serviceId]
  );

  const CustomMenuList = useMemo(() => {
    const MenuListWithAddButton: ComponentType<
      MenuListComponentProps<AuthOption, boolean, GroupTypeBase<AuthOption>>
    > = ({ children }) => (
      <div>
        {children}
        <div className="text-center">
          <Button
            size="sm"
            variant="link"
            onClick={() => {
              setShow(true);
            }}
          >
            + Add new
          </Button>
        </div>
      </div>
    );
    return MenuListWithAddButton;
  }, [setShow]);

  const initialConfiguration: RawServiceConfiguration = useMemo(
    () =>
      ({
        serviceId,
        label: "New Configuration",
        config: {},
      } as RawServiceConfiguration),
    [serviceId]
  );

  return (
    <>
      {showModal && (
        <ServiceEditorModal
          configuration={initialConfiguration}
          service={serviceDefinition}
          onClose={() => setShow(false)}
          onSave={save}
        />
      )}

      <div className="d-inline-flex">
        {options.length > 0 && (
          <div style={{ minWidth: "300px" }} className="mr-2">
            <ServiceAuthSelector
              name={`services.${serviceId}`}
              serviceId={serviceId}
              authOptions={options}
              CustomMenuList={CustomMenuList}
            />
          </div>
        )}
        <div>
          {options.length === 0 && (
            <Button
              variant={options.length > 0 ? "info" : "primary"}
              size="sm"
              style={{ height: "36px", marginTop: "1px" }}
              onClick={() => {
                setShow(true);
              }}
              disabled={isPending || error != null}
            >
              <FontAwesomeIcon icon={faPlus} /> Configure
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

const ServiceDescriptor: React.FunctionComponent<{
  serviceConfigs: ServiceDefinition[];
  serviceId: string;
}> = ({ serviceId, serviceConfigs }) => {
  const config = useMemo(
    () => serviceConfigs?.find((x) => x.metadata.id === serviceId),
    [serviceId, serviceConfigs]
  );

  if (config) {
    return (
      <div>
        <div>{config && <span>{config.metadata.name}</span>}</div>
        <code className="small p-0">{serviceId}</code>
      </div>
    );
  }

  return (
    <div>
      {config && <span>{config.metadata.name}</span>}
      <code className="p-0">{serviceId}</code>
    </div>
  );
};

const ServicesBody: React.FunctionComponent<OwnProps> = ({ blueprint }) => {
  const [authOptions] = useAuthOptions();

  const selected = useSelectedExtensions(blueprint.extensionPoints);

  const serviceConfigs = useFetch<ServiceDefinition[]>("/api/services/");

  const serviceIds = useMemo(
    // The PixieBrix service gets automatically configured, so don't need to show it. If the PixieBrix service is
    // the only service, the wizard won't render the ServicesBody component at all
    () =>
      uniq(selected.flatMap((x) => Object.values(x.services ?? {}))).filter(
        (serviceId) => serviceId !== PIXIEBRIX_SERVICE_ID
      ),
    [selected]
  );

  return (
    <>
      <Card.Body className="p-3">
        <Card.Title>Select Integrations</Card.Title>
        <p>
          Integrations tell PixieBrix how to connect to the other applications
          and integrations you use
        </p>
        <p className="text-info">
          <FontAwesomeIcon icon={faInfoCircle} /> You can configure integrations
          at any time on the{" "}
          <Link to="/services">
            <u>
              <FontAwesomeIcon icon={faCloud} />
              {"  "}Integrations page
            </u>
          </Link>
        </p>
      </Card.Body>
      <Table>
        <thead>
          <tr>
            <th style={{ minWidth: "200px" }}>Integration</th>
            <th className="w-100">Configuration</th>
          </tr>
        </thead>
        <tbody>
          {serviceIds.map((serviceId) => (
            <tr key={serviceId}>
              <td>
                <ServiceDescriptor
                  serviceId={serviceId}
                  serviceConfigs={serviceConfigs}
                />
              </td>
              <td>
                <AuthWidget authOptions={authOptions} serviceId={serviceId} />
              </td>
            </tr>
          ))}
          {serviceIds.length === 0 && (
            <tr>
              <td colSpan={2}>No services to configure</td>
            </tr>
          )}
        </tbody>
      </Table>
    </>
  );
};

export default ServicesBody;
