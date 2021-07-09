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

import React, { useState } from "react";
import { Tab, Table } from "react-bootstrap";
import { FieldArray, useField } from "formik";
import { ServiceDependency } from "@/core";
import { DependencyRow } from "@/options/pages/extensionEditor/ServicesFormCard";
import { useAuthOptions } from "@/options/pages/extensionEditor/ServiceAuthSelector";
import { head } from "lodash";
import { useFetch } from "@/hooks/fetch";
import { ServiceDefinition } from "@/types/definitions";
import ServiceModal from "@/components/fields/ServiceModal";
import { PACKAGE_REGEX } from "@/blocks/types";

function defaultOutputKey(serviceId: string): string {
  const match = PACKAGE_REGEX.exec(serviceId);
  return match.groups.collection?.replace(".", "_").replace("-", "_") ?? "";
}

const ServicesTab: React.FunctionComponent<{
  name?: string;
  eventKey?: string;
}> = ({ name = "services", eventKey = "services" }) => {
  const [field, meta] = useField(name);
  const [selectKey, setKey] = useState(0);
  const [authOptions] = useAuthOptions();
  const services = useFetch<ServiceDefinition[]>("/api/services/");

  return (
    <Tab.Pane eventKey={eventKey} className="h-100">
      <p>
        Add integrations to re-use external accounts, resources, and APIs that
        you or your team have configured.
      </p>

      <FieldArray name={name}>
        {({ push, remove }) => (
          <div>
            <div>
              <ServiceModal
                key={selectKey}
                caption="Add Integration"
                services={services}
                onSelect={(x) => {
                  push({
                    id: x.metadata.id,
                    outputKey: defaultOutputKey(x.metadata.id),
                    config: head(
                      authOptions.filter(
                        (option) =>
                          option.local && option.serviceId === x.metadata.id
                      )
                    )?.value,
                  });
                  // reset value in dropdown
                  setKey((k) => k + 1);
                }}
              />
            </div>
            {typeof meta.error === "string" && <span>{meta.error}</span>}

            {field.value?.length > 0 && (
              <Table>
                <thead>
                  <tr>
                    <th style={{ width: 250 }}>Key</th>
                    <th>Type</th>
                    <th style={{ width: 350 }}>Service</th>
                    <th>&nbsp;</th>
                  </tr>
                </thead>
                <tbody>
                  {field.value.map(
                    (dependency: ServiceDependency, index: number) => (
                      <DependencyRow
                        key={index}
                        field={field}
                        authOptions={authOptions}
                        dependency={dependency}
                        index={index}
                        remove={remove}
                      />
                    )
                  )}
                </tbody>
              </Table>
            )}
          </div>
        )}
      </FieldArray>
    </Tab.Pane>
  );
};

export default ServicesTab;
