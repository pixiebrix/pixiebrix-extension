/* eslint-disable filenames/match-exported */
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

import React, { useCallback, useMemo, useState } from "react";
import { BlockOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import { compact } from "lodash";
import { Expression, Schema } from "@/core";
import { useField } from "formik";
import { useAsyncState } from "@/hooks/common";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { Webhook } from "@/contrib/zapier/contract";
import { pixieServiceFactory } from "@/services/locator";
import { getBaseURL } from "@/services/baseService";
import { ZAPIER_PERMISSIONS, ZAPIER_PROPERTIES } from "@/contrib/zapier/push";
import { requestPermissions } from "@/utils/permissions";
import { containsPermissions, proxyService } from "@/background/messenger/api";
import AsyncButton from "@/components/AsyncButton";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import ObjectWidget from "@/components/fields/schemaFields/widgets/ObjectWidget";
import { defaultFieldFactory } from "@/components/fields/schemaFields/SchemaFieldContext";
import { makeLabelForSchemaField } from "@/components/fields/schemaFields/schemaFieldUtils";
import { isExpression } from "@/runtime/mapArgs";
import WorkshopMessageWidget from "@/components/fields/schemaFields/widgets/WorkshopMessageWidget";

function useHooks(): {
  hooks: Webhook[];
  isPending: boolean;
  error: unknown;
} {
  const [hooks, isPending, error] = useAsyncState(async () => {
    const { data } = await proxyService<{ new_push_fields: Webhook[] }>(
      await pixieServiceFactory(),
      {
        baseURL: await getBaseURL(),
        url: "/api/webhooks/hooks/",
        method: "get",
      }
    );

    return data.new_push_fields;
  }, []);

  return { hooks, isPending, error };
}

export const ZapField: React.FunctionComponent<
  SchemaFieldProps & { hooks: Webhook[]; error: unknown }
> = ({ hooks, error, ...props }) => {
  const options = useMemo(
    () =>
      (hooks ?? []).map((x) => ({
        value: x.display_name,
        label: x.display_name,
        hook: x,
      })),
    [hooks]
  );

  return (
    <ConnectedFieldTemplate
      name={props.name}
      label={makeLabelForSchemaField(props)}
      description="The Zap to run"
      as={SelectWidget}
      blankValue={null}
      options={options}
      loadingMessage="Loading Zaps..."
      loadingError={error}
    />
  );
};

const ObjectField = defaultFieldFactory(ObjectWidget);

const PushOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
  configKey,
}) => {
  const basePath = compact([name, configKey]).join(".");

  const [grantedPermissions, setGrantedPermissions] = useState<boolean>(false);
  const [hasPermissions] = useAsyncState(
    async () => containsPermissions(ZAPIER_PERMISSIONS),
    []
  );

  const [{ value: pushKey }] = useField<string | Expression>(
    `${basePath}.pushKey`
  );

  const { hooks, error } = useHooks();

  const onRequestPermissions = useCallback(async () => {
    const result = await requestPermissions(ZAPIER_PERMISSIONS);
    setGrantedPermissions(result);
  }, [setGrantedPermissions]);

  const hook = useMemo(() => hooks?.find((x) => x.display_name === pushKey), [
    hooks,
    pushKey,
  ]);

  if (!(grantedPermissions || hasPermissions)) {
    return (
      <div className="my-2">
        <p>
          You must grant permissions for you browser to send information to
          Zapier.
        </p>
        <AsyncButton onClick={onRequestPermissions}>
          Grant Permissions
        </AsyncButton>
      </div>
    );
  }

  return isExpression(pushKey) ? (
    <WorkshopMessageWidget />
  ) : (
    <div>
      <ZapField
        label="Zap"
        name={`${basePath}.pushKey`}
        schema={ZAPIER_PROPERTIES.pushKey as Schema}
        hooks={hooks}
        error={error}
      />

      {pushKey && hook && (
        // Using ObjectField instead of ChildObjectField here to allow for additionalProperties.
        <ObjectField name={`${basePath}.data`} schema={hook.input_schema} />
      )}
    </div>
  );
};

export default PushOptions;
