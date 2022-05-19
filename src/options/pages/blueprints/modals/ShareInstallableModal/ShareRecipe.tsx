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

import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import SwitchButtonWidget from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import { useGetOrganizationsQuery } from "@/services/api";
import { faGlobe } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import FieldTemplate from "@/components/form/FieldTemplate";
import { FormikProps, FormikValues } from "formik";
import { sortBy, uniq } from "lodash";
import React from "react";
import ActivationLink from "./ActivationLink";

const ShareRecipe: React.FunctionComponent<FormikProps<FormikValues>> = ({
  values,
  setFieldValue,
}) => {
  const { data: organizations = [] } = useGetOrganizationsQuery();

  return (
    <div>
      <ConnectedFieldTemplate
        name="public"
        as={SwitchButtonWidget}
        description={
          // \u00A0 stands for &nbsp;
          values.public ? <i>Visible to all PixieBrix users</i> : "\u00A0"
        }
        label={
          <span>
            <FontAwesomeIcon icon={faGlobe} /> Public
          </span>
        }
      />

      {sortBy(organizations, (organization) => organization.name).map(
        (organization) => {
          const checked = values.organizations.includes(organization.id);
          return (
            <FieldTemplate
              key={organization.id}
              name={organization.id}
              as={SwitchButtonWidget}
              label={organization.name}
              value={checked}
              onChange={() => {
                const next = checked
                  ? values.organizations.filter(
                      (x: string) => x !== organization.id
                    )
                  : uniq([...values.organizations, organization.id]);
                setFieldValue("organizations", next);
              }}
            />
          );
        }
      )}

      <ActivationLink blueprintId={values.blueprintId} />
    </div>
  );
};

export default ShareRecipe;
