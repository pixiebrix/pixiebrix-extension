import React, { useMemo } from "react";
import { useField, useFormikContext } from "formik";
import BootstrapSwitchButton from "bootstrap-switch-button-react";
import { Card, Table } from "react-bootstrap";
import {
  ExtensionPointDefinition,
  RecipeDefinition,
} from "@/types/definitions";
import { pickBy, identity } from "lodash";
import { WizardValues } from "@/options/pages/marketplace/wizard";

export function selectedExtensions(
  values: WizardValues,
  extensions: ExtensionPointDefinition[]
): ExtensionPointDefinition[] {
  const indexes = Object.keys(pickBy(values.extensions, identity)).map((x) =>
    Number.parseInt(x, 10)
  );
  console.debug("selected extensions", {
    extensions: values.extensions,
    indexes,
  });
  return extensions.filter((x, i) => indexes.includes(i));
}

export function useSelectedExtensions(
  extensions: ExtensionPointDefinition[]
): ExtensionPointDefinition[] {
  const { values } = useFormikContext<WizardValues>();
  return useMemo(() => selectedExtensions(values, extensions), [
    extensions,
    values,
  ]);
}

const ConfigureRow: React.FunctionComponent<{
  definition: ExtensionPointDefinition;
  name: string;
}> = ({ definition, name }) => {
  const [field, , helpers] = useField(name);
  return (
    <tr>
      <td>
        <BootstrapSwitchButton
          onlabel=" "
          offlabel=" "
          checked={field.value}
          onChange={(checked) => helpers.setValue(checked)}
        />
      </td>
      <td>
        <code className="pl-0">{definition.id}</code>
      </td>
      <td>{definition.label ?? "No label provided"}</td>
    </tr>
  );
};

interface OwnProps {
  blueprint: RecipeDefinition;
}

const ConfigureBody: React.FunctionComponent<OwnProps> = ({ blueprint }) => {
  return (
    <>
      <Card.Body className="p-3">
        <h3>{blueprint.metadata.name}</h3>
        <code className="p-0">{blueprint.metadata.id}</code>
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
      <Table>
        <thead>
          <tr>
            <th>Activate?</th>
            <th>Foundation</th>
            <th className="w-100">Label</th>
          </tr>
        </thead>
        <tbody>
          {blueprint.extensionPoints.map((x, i) => (
            <ConfigureRow key={i} definition={x} name={`extensions.${i}`} />
          ))}
        </tbody>
      </Table>
    </>
  );
};

export default ConfigureBody;
