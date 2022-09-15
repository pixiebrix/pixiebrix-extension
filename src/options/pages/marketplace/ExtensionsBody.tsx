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

import styles from "./ExtensionsBody.module.scss";

import React, { useMemo } from "react";
import { useFormikContext } from "formik";
import { Badge, Col } from "react-bootstrap";
import { RecipeDefinition } from "@/types/definitions";
import { WizardValues } from "@/options/pages/marketplace/wizardTypes";
import { ServiceAuthPair } from "@/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCube } from "@fortawesome/free-solid-svg-icons";

// TODO: what is this for?
function selectedAuths(values: WizardValues): ServiceAuthPair[] {
  return values.services.filter((x) => x.config);
}

export function useSelectedAuths(): ServiceAuthPair[] {
  const { values } = useFormikContext<WizardValues>();
  return useMemo(() => selectedAuths(values), [values]);
}

const ExtensionBadge: React.FunctionComponent<{
  name: string;
}> = ({ name }) => (
  <Badge className={styles.extensionBadge}>
    <FontAwesomeIcon icon={faCube} /> {name}
  </Badge>
);

interface OwnProps {
  blueprint: RecipeDefinition;
}

const ExtensionsBody: React.FunctionComponent<OwnProps> = ({ blueprint }) => (
  <Col>
    {
      // Since 1.6.5, during reactivation all extensions are toggled on by default. This is to account for a
      // situation where a user upgrades to a new version of a blueprint that has additional required extensions.
      // In the future, we will likely remove the ability to toggle extensions altogether
      // See https://github.com/pixiebrix/pixiebrix-extension/issues/3551 for more information.
      // For now, we're just hard-coding the initialValue but keeping the parameter because we may want to
      // reintroduce conditional logic in the future
      blueprint.extensionPoints.map((definition, index) => (
        <ExtensionBadge key={definition.id} name={definition.label} />
      ))
    }
  </Col>
);

export default ExtensionsBody;
