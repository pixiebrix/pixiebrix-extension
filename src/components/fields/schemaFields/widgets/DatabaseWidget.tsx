/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useField } from "formik";
import useDatabaseOptions from "@/hooks/useDatabaseOptions";
import DatabaseCreateModal from "./DatabaseCreateModal";
import { isExpression } from "@/runtime/mapArgs";
import SelectWidget, {
  type SelectLike,
  type Option,
} from "@/components/form/widgets/SelectWidget";
import createMenuListWithAddButton from "@/components/form/widgets/createMenuListWithAddButton";
import { makeTemplateExpression } from "@/runtime/expressionCreators";
import FieldRuntimeContext from "@/components/fields/schemaFields/FieldRuntimeContext";
import { type UUID } from "@/types/stringTypes";
import { type Expression } from "@/types/runtimeTypes";
import { type SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { useIsMounted } from "@/hooks/common";
import { isUUID, validateUUID } from "@/types/helpers";

const DatabaseWidget: React.FunctionComponent<SchemaFieldProps> = ({
  name,
  schema,
  isRequired,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [{ value: fieldValue }, , { setValue: setFieldValue }] = useField<
    UUID | Expression | string
  >(name);
  const { allowExpressions } = useContext(FieldRuntimeContext);

  const { databaseOptions, isLoading: isLoadingDatabaseOptions } =
    useDatabaseOptions();

  const setDatabaseId = (databaseId: UUID) => {
    if (allowExpressions) {
      setFieldValue(makeTemplateExpression("nunjucks", databaseId));
    } else {
      setFieldValue(databaseId);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on mount
  const initialFieldValue = useMemo(() => fieldValue, []);
  const hasPreviewValue =
    schema.format === "preview" &&
    typeof initialFieldValue === "string" &&
    !isUUID(initialFieldValue);
  const fullDatabaseOptions = useMemo(() => {
    const loadedOptions = isLoadingDatabaseOptions ? [] : databaseOptions;

    // If the schema format is 'preview', and the initial field value is a string, use that string
    // as the auto-created database name, and add it as an option to the database dropdown at the
    // top of the list.
    if (hasPreviewValue) {
      const existingDatabaseOption = loadedOptions.find(
        (option) => option.label === `${initialFieldValue} - Private`
      );

      // If the database doesn't exist, add the preview option to match the field value
      if (!existingDatabaseOption) {
        return [
          {
            label: initialFieldValue,
            value: initialFieldValue,
          },
          ...loadedOptions,
        ];
      }

      // Database already exists, select it
      setDatabaseId(validateUUID(existingDatabaseOption.value));
    }

    return loadedOptions;
  }, [
    databaseOptions,
    hasPreviewValue,
    initialFieldValue,
    isLoadingDatabaseOptions,
    setDatabaseId,
  ]);

  const containerRef = useRef<HTMLDivElement>();
  useEffect(() => {
    // If the field has a preview value, traverse up to the .form-group parent,
    // and add a CSS class. I realize this is kinda gross. If you have a better
    // idea then plz fix thx.
    if (hasPreviewValue && containerRef) {
      let parent = containerRef.current?.parentElement;
      while (parent) {
        if (parent.classList.contains("form-group")) {
          parent.classList.add("has-preview-value");
          break;
        }

        parent = parent.parentElement;
      }
    }
  }, [hasPreviewValue]);

  const checkIsMounted = useIsMounted();

  const onModalClose = () => {
    if (!checkIsMounted()) {
      return;
    }

    setShowModal(false);
  };

  const onDatabaseCreated = (databaseId: UUID) => {
    if (!checkIsMounted()) {
      return;
    }

    onModalClose();
    setDatabaseId(databaseId);
  };

  return (
    <div ref={containerRef}>
      <DatabaseCreateModal
        show={showModal}
        onClose={onModalClose}
        onDatabaseCreated={onDatabaseCreated}
      />

      <SelectWidget
        name={name}
        options={fullDatabaseOptions}
        isLoading={isLoadingDatabaseOptions}
        isClearable={!isRequired || isLoadingDatabaseOptions}
        value={isExpression(fieldValue) ? fieldValue.__value__ : fieldValue}
        onChange={(event: React.ChangeEvent<SelectLike<Option<UUID>>>) => {
          setDatabaseId(event.target.value);
        }}
        components={{
          MenuList: createMenuListWithAddButton(() => {
            setShowModal(true);
          }),
        }}
      />
    </div>
  );
};

export default DatabaseWidget;
