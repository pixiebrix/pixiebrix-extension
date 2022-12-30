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

import React from "react";
import { type SchemaFieldComponent } from "@/components/fields/schemaFields/propTypes";
import BasicSchemaField from "@/components/fields/schemaFields/BasicSchemaField";
import ServiceField from "@/components/fields/schemaFields/ServiceField";
import AppServiceField from "@/components/fields/schemaFields/AppServiceField";
import CssClassField from "./CssClassField";
import HeadingStyleField from "./HeadingStyleField";
import {
  isAppServiceField,
  isCssClassField,
  isHeadingStyleField,
  isServiceField,
} from "./fieldTypeCheckers";
import RootAwareField from "@/components/fields/schemaFields/RootAwareField";

const SchemaField: SchemaFieldComponent = (props) => {
  const { schema } = props;

  if (isAppServiceField(schema)) {
    return <AppServiceField {...props} />;
  }

  if (isServiceField(schema)) {
    return <ServiceField {...props} />;
  }

  if (isCssClassField(schema)) {
    return <CssClassField {...props} />;
  }

  if (isHeadingStyleField(schema)) {
    return <HeadingStyleField {...props} />;
  }

  if (props.name.endsWith(".isRootAware")) {
    // Hide the isRootAware field if rendered as part of config.isRootAware. The field was introduced for
    // backward compatibility when upgrading DOM bricks to be root-aware.
    return <RootAwareField {...props} />;
  }

  return <BasicSchemaField {...props} />;
};

export default SchemaField;
