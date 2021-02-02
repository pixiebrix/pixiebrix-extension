/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useState } from "react";
import { Tab, Table } from "react-bootstrap";
import { FieldArray, useField } from "formik";
import { ServiceDependency } from "@/core";
import { DependencyRow } from "@/options/pages/extensionEditor/ServicesFormCard";
import { useAuthOptions } from "@/options/pages/extensionEditor/ServiceAuthSelector";
import ServiceSelector from "@/components/ServiceSelector";
import { head } from "lodash";

const PACKAGE_REGEX = /^((?<scope>@[a-z0-9-~][a-z0-9-._~]*)\/)?((?<collection>[a-z0-9-~][a-z0-9-._~]*)\/)?(?<name>[a-z0-9-~][a-z0-9-._~]*)$/;

function defaultOutputKey(serviceId: string): string {
  const match = PACKAGE_REGEX.exec(serviceId);
  return match.groups.collection?.replace(".", "_") ?? "";
}

const ServicesTab: React.FunctionComponent<{
  name?: string;
  eventKey?: string;
}> = ({ name = "services", eventKey = "services" }) => {
  const [field, meta] = useField(name);
  const [selectKey, setKey] = useState(0);
  const [authOptions] = useAuthOptions();

  return (
    <Tab.Pane eventKey={eventKey} className="h-100">
      <p>
        Add services to re-use external accounts and resources that you or your
        team have configured.
      </p>

      <FieldArray name={name}>
        {({ push, remove }) => (
          <div>
            <div style={{ width: 300 }}>
              <ServiceSelector
                key={selectKey}
                placeholder="Pick a service to add"
                onSelect={(x) => {
                  // reset value in dropdown
                  setKey((k) => k + 1);
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
