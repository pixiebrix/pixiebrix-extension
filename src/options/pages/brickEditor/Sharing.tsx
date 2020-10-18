import BootstrapSwitchButton from "bootstrap-switch-button-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobe } from "@fortawesome/free-solid-svg-icons";
import sortBy from "lodash/sortBy";
import uniq from "lodash/uniq";
import Table from "react-bootstrap/Table";
import React from "react";
import { useField } from "formik";
import { useOrganization } from "@/hooks/organization";

const SharingTable: React.FunctionComponent = () => {
  const { organizations = [] } = useOrganization();
  const [publicField, , { setValue: setPublic }] = useField("public");
  const [organizationsField, , { setValue: setOrganizations }] = useField(
    "organizations"
  );

  return (
    <Table>
      <tbody>
        <tr>
          <td width="100">
            <BootstrapSwitchButton
              onlabel=" "
              offlabel=" "
              checked={publicField.value}
              onChange={setPublic}
            />
          </td>
          <td>
            {publicField.value ? (
              <span>
                <FontAwesomeIcon icon={faGlobe} /> Public{" "}
                <span className="text-primary">
                  <i> &ndash; visible to all PixieBrix users</i>
                </span>
              </span>
            ) : (
              <span>
                <FontAwesomeIcon icon={faGlobe} /> Public
              </span>
            )}
          </td>
        </tr>
        {sortBy(organizations, (x) => x.name).map((organization) => (
          <tr key={organization.id}>
            <td width="100">
              <BootstrapSwitchButton
                onlabel=" "
                offlabel=" "
                checked={organizationsField.value.includes(organization.id)}
                onChange={(checked: boolean) => {
                  const next = checked
                    ? uniq([...organizationsField.value, organization.id])
                    : organizationsField.value.filter(
                        (x: string) => x !== organization.id
                      );
                  setOrganizations(next);
                }}
              />
            </td>
            <td>{organization.name}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default SharingTable;
