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
import { useFormikContext } from "formik";
import ArrayWidget from "@/components/fields/schemaFields/widgets/ArrayWidget";
import FieldRuntimeContext from "@/components/fields/schemaFields/FieldRuntimeContext";
import { PAGE_EDITOR_DEFAULT_BRICK_API_VERSION } from "@/pageEditor/extensionPoints/base";
import { FormState } from "@/pageEditor/pageEditorTypes";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { Schema } from "@/core";
import * as Yup from "yup";

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/URLPattern
 *
 * Leaving off the more obscure URL parts for now
 */
export const urlSchemaProject: Schema = {
  type: "object",
  properties: {
    hostname: {
      type: "string",
      description: "Pattern to match the hostname part of a URL.",
    },
    pathname: {
      type: "string",
      description: "Pattern to match the pathname part of a URL.",
    },
    hash: {
      type: "string",
      description: "Pattern to match the hash part of a URL.",
    },
    search: {
      type: "string",
      description: "Pattern to match the search part of a URL.",
    },
  },
  additionalProperties: {
    type: "string",
  },
};

const validationSchema = Yup.object().shape({
  hostname: Yup.string()
    .nullable()
    .transform((x) => (x === "" ? null : x))
    .matches(
      /^((?<scheme>\*|http|https|ftp|urn):\/\/(?<host>\*|(\*\.)?[^\/\*]+))|(?<file>file:\/\/)$/,
      'Hostname should match the pattern <scheme>://<host>, for example "https://example.org" or "*://*.google.com"'
    ),
  pathname: Yup.string()
    .nullable()
    .transform((x) => (x === "" ? null : x))
    .matches(/^\/.*$/, 'Pathname should match the pattern "/" <any chars>'),
});

const UrlPatternWidget: React.VFC<SchemaFieldProps> = (props) => {
  const { values: formState } = useFormikContext<FormState>();

  return (
    <FieldRuntimeContext.Provider
      value={{
        apiVersion:
          formState.apiVersion ?? PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
        allowExpressions: false,
      }}
    >
      <ArrayWidget
        schema={{ items: urlSchemaProject }}
        validationSchema={validationSchema}
        addButtonCaption="Add URL Pattern"
        {...props}
      />
    </FieldRuntimeContext.Provider>
  );
};

export default UrlPatternWidget;
