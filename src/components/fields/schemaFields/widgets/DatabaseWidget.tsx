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

import React, { useContext, useMemo, useState } from "react";
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
import { isUUID } from "@/types/helpers";

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

  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on mount
  const initialFieldValue = useMemo(() => fieldValue, []);

  const fullDatabaseOptions = useMemo(() => {
    const loadedOptions = isLoadingDatabaseOptions ? [] : databaseOptions;

    // If the schema format is 'preview', and the initial field value is a string, use that string
    // as the auto-created database name, and add it as an option to the database dropdown at the
    // top of the list.
    if (
      schema.format === "preview" &&
      typeof initialFieldValue === "string" &&
      !isUUID(initialFieldValue) &&
      // Don't add the placeholder if a DB with the name already exists
      !loadedOptions.some((option) => option.label === initialFieldValue)
    ) {
      return [
        {
          label: initialFieldValue,
          value: initialFieldValue,
        },
        ...loadedOptions,
      ];
    }

    return loadedOptions;
  }, [
    databaseOptions,
    initialFieldValue,
    isLoadingDatabaseOptions,
    schema.format,
  ]);

  const checkIsMounted = useIsMounted();

  const setDatabaseId = (databaseId: UUID) => {
    if (allowExpressions) {
      setFieldValue(makeTemplateExpression("nunjucks", databaseId));
    } else {
      setFieldValue(databaseId);
    }
  };

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
    <>
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
    </>
  );
};

export default DatabaseWidget;
