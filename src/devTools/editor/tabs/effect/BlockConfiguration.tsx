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

import React from "react";
import { IBlock, UUID } from "@/core";
import { FastField, FieldInputProps, getIn, useFormikContext } from "formik";
import { useBlockOptions } from "@/components/fields/BlockField";
import { Card, Form } from "react-bootstrap";
import { RendererContext } from "@/components/fields/blockOptions";
import devtoolFields from "@/devTools/editor/fields/Fields";
import GridLoader from "react-spinners/GridLoader";
import TraceView from "@/devTools/editor/tabs/effect/TraceView";

const BlockConfiguration: React.FunctionComponent<{
  name: string;
  block: IBlock;
  showOutput: boolean;
}> = ({ name, block, showOutput }) => {
  const context = useFormikContext();

  const blockErrors = getIn(context.errors, name);

  const [{ error }, BlockOptions] = useBlockOptions(block.id);

  return (
    <div className="BlockAccordion">
      <Card>
        <Card.Header className="BlockAccordion__header">Input</Card.Header>
        <Card.Body>
          <div>
            <RendererContext.Provider value={devtoolFields}>
              {blockErrors?.id && (
                <div className="invalid-feedback d-block mb-4">
                  Unknown block {block.id}
                </div>
              )}
              {BlockOptions ? (
                <BlockOptions
                  name={name}
                  configKey="config"
                  showOutputKey={false}
                />
              ) : error ? (
                <div className="invalid-feedback d-block mb-4">{error}</div>
              ) : (
                <GridLoader />
              )}
            </RendererContext.Provider>
          </div>
        </Card.Body>
      </Card>
      {showOutput && (
        <Card>
          <Card.Header className="BlockAccordion__header">Output</Card.Header>
          <Card.Body>
            <Form.Label>Output key</Form.Label>
            <FastField name={`${name}.outputKey`}>
              {({ field }: { field: FieldInputProps<string> }) => (
                <Form.Control type="text" {...field} />
              )}
            </FastField>
            <Form.Text className="text-muted">
              Provide a output key to refer to the outputs of this block later.
              For example, if you provide the name <code>output</code>, you can
              use the output later with <code>@output</code>.
            </Form.Text>
          </Card.Body>
        </Card>
      )}
      <Card>
        <Card.Header className="BlockAccordion__header">
          Advanced: Template Engine
        </Card.Header>
        <Card.Body>
          <Form.Label>Template engine</Form.Label>
          <FastField name={`${name}.templateEngine`}>
            {({ field }: { field: FieldInputProps<string> }) => (
              <Form.Control as="select" {...field}>
                <option value="mustache">Mustache</option>
                <option value="handlebars">Handlebars</option>
                <option value="nunjucks">Nunjucks</option>
              </Form.Control>
            )}
          </FastField>
          <Form.Text className="text-muted">
            The template engine controls how PixieBrix fills in{" "}
            <code>{"{{variables}}"}</code> in the inputs.
          </Form.Text>
        </Card.Body>
      </Card>
      <Card>
        <Card.Header className="BlockAccordion__header">Trace</Card.Header>
        <Card.Body>
          <FastField name={`${name}.instanceId`}>
            {({ field }: { field: FieldInputProps<UUID> }) => (
              <TraceView instanceId={field.value} />
            )}
          </FastField>
        </Card.Body>
      </Card>
    </div>
  );
};

export default BlockConfiguration;
