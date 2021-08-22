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
} from "@/options/pages/extensionEditor/ServiceAuthSelector";
import { useField } from "formik";
import { useDispatch } from "react-redux";
import { useToasts } from "react-toast-notifications";
import { useAsyncState } from "@/hooks/common";
import registry from "@/services/registry";
import { RawServiceConfiguration, UUID } from "@/core";
import { uuidv4 } from "@/types/helpers";
import { persistor } from "@/options/store";
import { refresh as refreshBackgroundLocator } from "@/background/locator";
import { GroupTypeBase, MenuListComponentProps } from "react-select";
import { Button } from "react-bootstrap";
import ServiceEditorModal from "@/options/pages/services/ServiceEditorModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { servicesSlice } from "@/options/slices";

const { updateServiceConfig } = servicesSlice.actions;

const AuthWidget: React.FunctionComponent<{
  name?: string;
  authOptions: AuthOption[];
  serviceId: string;
}> = ({ name, serviceId, authOptions }) => {
  const helpers = useField<UUID>(name ?? `services.${serviceId}`)[2];
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
          onClose={() => {
            setShow(false);
          }}
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

export default AuthWidget;
