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

import React, { useEffect, useMemo } from "react";
import { useField, useFormikContext } from "formik";
import BootstrapSwitchButton from "bootstrap-switch-button-react";
import { Card, Table } from "react-bootstrap";
import { ExtensionPointConfig, RecipeDefinition } from "@/types/definitions";
import { identity, pickBy } from "lodash";
import { WizardValues } from "@/options/pages/marketplace/wizardTypes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCubes, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import { ServiceAuthPair } from "@/core";
import { useSelector } from "react-redux";
import { selectExtensions } from "@/store/extensionsSelectors";

function selectedAuths(values: WizardValues): ServiceAuthPair[] {
  return values.services.filter((x) => x.config);
}

export function selectedExtensions(
  values: WizardValues,
  extensions: ExtensionPointConfig[]
): ExtensionPointConfig[] {
  const indexes = Object.keys(pickBy(values.extensions, identity)).map((x) =>
    Number.parseInt(x, 10)
  );
  return extensions.filter((_, index) => indexes.includes(index));
}

export function useSelectedAuths(): ServiceAuthPair[] {
  const { values } = useFormikContext<WizardValues>();
  return useMemo(() => selectedAuths(values), [values]);
}

export function useSelectedExtensions(
  extensions: ExtensionPointConfig[]
): ExtensionPointConfig[] {
  const { values } = useFormikContext<WizardValues>();
  return useMemo(() => selectedExtensions(values, extensions), [
    extensions,
    values,
  ]);
}

const ConfigureRow: React.FunctionComponent<{
  definition: ExtensionPointConfig;
  name: string;
  initialValue: boolean;
}> = ({ definition, name, initialValue }) => {
  const [field, , helpers] = useField(name);

  useEffect(() => {
    helpers.setValue(initialValue);
    // Initial value should be set only on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <tr>
      <td>
        <BootstrapSwitchButton
          onlabel=" "
          offlabel=" "
          onstyle="info"
          checked={field.value}
          onChange={(checked) => {
            helpers.setValue(checked);
          }}
        />
      </td>
      <td>
        {field.value ? (
          <span className="text-info">Selected</span>
        ) : (
          <span className="text-muted">Ignore</span>
        )}
      </td>
      <td>{definition.label ?? "No label provided"}</td>
    </tr>
  );
};

interface OwnProps {
  blueprint: RecipeDefinition;
  reinstall: boolean;
}

const ConfigureBody: React.FunctionComponent<OwnProps> = ({
  blueprint,
  reinstall,
}) => {
  const extensions = useSelector(selectExtensions);

  const installedExtensions = useMemo(
    () =>
      extensions?.filter(
        (extension) => extension._recipe?.id === blueprint?.metadata.id
      ),
    [blueprint, extensions]
  );

  return (
    <>
      <Card.Body className="p-3">
        <h3 className="pb-1 mb-0">{blueprint.metadata.name}</h3>
        <code className="p-0 small">{blueprint.metadata.id}</code>
        <div className="pt-3">
          <p>
            {blueprint.metadata.description ?? (
              <span>
                <i>No description provided</i>
              </span>
            )}
          </p>
        </div>
      </Card.Body>

      <Card.Body className="px-3 py-0">
        <p className="text-info">
          <FontAwesomeIcon icon={faInfoCircle} /> Don&apos;t know which bricks
          to select? Don&apos;t worry! &mdash; you can de-activate bricks at any
          time on the{" "}
          <Link to="/installed">
            <u>
              <FontAwesomeIcon icon={faCubes} />
              {"  "}Active Bricks page
            </u>
          </Link>
        </p>
      </Card.Body>

      <Table>
        <thead>
          <tr>
            <th colSpan={2}>Selected?</th>
            <th className="w-100">Name/Description</th>
          </tr>
        </thead>
        <tbody>
          {blueprint.extensionPoints.map((x, i) => {
            // Unless user is reinstalling, bricks should be toggled ON by default
            const shouldBeOn =
              !reinstall ||
              installedExtensions?.some(
                // TODO: maybe need to implement a better way to do this
                (installedExtension) => x.label === installedExtension.label
              );
            return (
              <ConfigureRow
                key={i}
                definition={x}
                name={`extensions.${i}`}
                initialValue={shouldBeOn}
              />
            );
          })}
        </tbody>
      </Table>
    </>
  );
};

export default ConfigureBody;
