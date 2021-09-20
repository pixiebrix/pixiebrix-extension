/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { useRef } from "react";
import { RegistryId, TemplateEngine } from "@/core";
import { getIn, useField, useFormikContext } from "formik";
import { useBlockOptions } from "@/hooks/useBlockOptions";
import { Button, Card } from "react-bootstrap";
import SchemaFieldContext from "@/components/fields/schemaFields/SchemaFieldContext";
import devtoolFieldOverrides from "@/devTools/editor/fields/devtoolFieldOverrides";
import GridLoader from "react-spinners/GridLoader";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import styles from "./BlockConfiguration.module.scss";

const BlockConfiguration: React.FunctionComponent<{
  name: string;
  blockId: RegistryId;
}> = ({ name, blockId }) => {
  const context = useFormikContext();

  const blockErrors = getIn(context.errors, name);

  const [{ error }, BlockOptions] = useBlockOptions(blockId);

  const templateEngineFieldName = `${name}.templateEngine`;

  const { value: templateEngineValue } = useField<TemplateEngine>(
    templateEngineFieldName
  )[0];

  const templateEngineRef = useRef<HTMLDivElement>();

  const onClickTemplateEngineLink = () => {
    if (templateEngineRef.current === undefined) {
      return;
    }

    templateEngineRef.current.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {templateEngineValue && (
        <div className={styles.advancedLinks}>
          <Button variant="link" size="sm" onClick={onClickTemplateEngineLink}>
            {`Template Engine: ${templateEngineValue}`}
          </Button>
        </div>
      )}
      <Card className={styles.card}>
        <Card.Header className={styles.cardHeader}>Input</Card.Header>
        <Card.Body>
          <div>
            <SchemaFieldContext.Provider value={devtoolFieldOverrides}>
              {blockErrors?.id && (
                <div className="invalid-feedback d-block mb-4">
                  Unknown block {blockId}
                </div>
              )}
              {BlockOptions ? (
                <BlockOptions name={name} configKey="config" />
              ) : error ? (
                <div className="invalid-feedback d-block mb-4">{error}</div>
              ) : (
                <GridLoader />
              )}
            </SchemaFieldContext.Provider>
          </div>
        </Card.Body>
      </Card>
      <Card className={styles.card}>
        <Card.Header className={styles.cardHeader}>
          Advanced Options
        </Card.Header>
        <Card.Body ref={templateEngineRef}>
          <ConnectedFieldTemplate
            name={templateEngineFieldName}
            layout="vertical"
            label="Template engine"
            as="select"
            description={
              <p>
                The template engine controls how PixieBrix fills in{" "}
                <code>{"{{variables}}"}</code> in the inputs.
              </p>
            }
          >
            <option value="mustache">Mustache</option>
            <option value="handlebars">Handlebars</option>
            <option value="nunjucks">Nunjucks</option>
          </ConnectedFieldTemplate>
        </Card.Body>
      </Card>
    </>
  );
};

export default BlockConfiguration;
