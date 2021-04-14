/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useMemo } from "react";
import { PageTitle } from "@/layout/Page";
import { faHammer } from "@fortawesome/free-solid-svg-icons";
import { Row, Col, Button, Form } from "react-bootstrap";
import { Formik, useField } from "formik";
import { useFetch } from "@/hooks/fetch";
import { useParams } from "react-router";
import Editor from "./Editor";
import { GridLoader } from "react-spinners";
import useSubmitBrick from "./useSubmitBrick";
import yaml from "js-yaml";
import BootstrapSwitchButton from "bootstrap-switch-button-react";
import "./EditPage.scss";
import { useSelector } from "react-redux";
import { ExtensionOptions, OptionsState } from "@/options/slices";
import { MessageContext } from "@/core";
import { useDebounce } from "use-debounce";
import { selectExtensions } from "@/options/pages/InstalledPage";

interface BrickData {
  id: string;
  config: string;
  organizations: string[];
  public: boolean;
}

function useDetectBlueprint(
  config: string | null
): { isBlueprint: boolean; isInstalled: boolean } {
  const extensions = useSelector<{ options: OptionsState }, ExtensionOptions[]>(
    ({ options }) => {
      return Object.values(
        options.extensions
      ).flatMap((extensionPointOptions) =>
        Object.values(extensionPointOptions)
      );
    }
  );

  return useMemo(() => {
    if (config == null) {
      return { isBlueprint: false, isInstalled: false };
    }
    const configJSON = yaml.safeLoad(config) as any;
    const isBlueprint = configJSON.kind === "recipe";
    if (isBlueprint) {
      return {
        isBlueprint: true,
        isInstalled: extensions.some(
          (x) => x._recipeId === configJSON.metadata?.id
        ),
      };
    } else {
      return { isBlueprint: false, isInstalled: false };
    }
  }, [config, extensions]);
}

const ToggleField: React.FunctionComponent<{ name: string }> = ({ name }) => {
  const [field, , helpers] = useField(name);
  return (
    <BootstrapSwitchButton
      onstyle="info"
      offstyle="light"
      onlabel=" "
      offlabel=" "
      checked={field.value}
      onChange={(value) => helpers.setValue(value)}
    />
  );
};

function useLogContext(config: string | null): MessageContext | null {
  const debouncedConfig = useDebounce(config, 250);
  const installed = useSelector(selectExtensions);

  const blueprintMap = useMemo(() => {
    return new Map<string, string>(installed.map((x) => [x._recipe.id, x.id]));
  }, [installed]);

  return useMemo(() => {
    try {
      const json = yaml.safeLoad(config) as any;
      switch (json.kind) {
        case "service": {
          return { serviceId: json.metadata.id };
        }
        case "extensionPoint": {
          return { extensionPointId: json.metadata.id };
        }
        case "component":
        case "reader": {
          return { blockId: json.metadata.id };
        }
        case "recipe": {
          const extensionId = blueprintMap.get(json.metadata.id);
          return extensionId ? { extensionId } : null;
        }
        default: {
          return null;
        }
      }
    } catch (err) {
      return null;
    }
  }, [debouncedConfig, blueprintMap]);
}

const EditPage: React.FunctionComponent = () => {
  const { id } = useParams<{ id: string }>();

  const url = `api/bricks/${id}/`;

  const data = useFetch<BrickData>(url);

  const { isBlueprint, isInstalled } = useDetectBlueprint(data?.config);

  const { submit, validate, remove } = useSubmitBrick({ url, create: false });

  const logContext = useLogContext(data?.config);

  if (!data) {
    return (
      <>
        <div className="d-flex">
          <div className="flex-grow-1">
            <PageTitle icon={faHammer} title="Edit Brick" />
          </div>
          <div className="flex-grow-1 text-right">
            <Button disabled>Update Brick</Button>
          </div>
        </div>
        <div>
          <GridLoader />
        </div>
      </>
    );
  }

  return (
    <Formik
      onSubmit={submit}
      validate={validate}
      initialValues={{ ...data, reactivate: isBlueprint && isInstalled }}
    >
      {({ values, isValid, handleSubmit, isSubmitting }) => (
        <Form noValidate onSubmit={handleSubmit} autoComplete="off">
          <div className="d-flex">
            <div className="flex-grow-1">
              <PageTitle icon={faHammer} title="Edit Brick" />
            </div>
            <div className="flex-grow-1 EditPage__toolbar">
              <div className="d-flex justify-content-end">
                {isBlueprint && isInstalled && (
                  <div className="mr-4 my-auto">
                    <ToggleField name="reactivate" />
                    <span className="ml-2">Re-activate Blueprint</span>
                  </div>
                )}
                <div>
                  <Button disabled={!isValid || isSubmitting} type="submit">
                    {values.public ? "Publish Brick" : "Update Brick"}
                  </Button>
                </div>
                <div>
                  <Button
                    disabled={isSubmitting}
                    variant="danger"
                    onClick={remove}
                  >
                    Delete Brick
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <Row>
            <Col className="mt-4" xl={8} lg={10} md={12}>
              <Editor logContext={logContext} />
            </Col>
          </Row>
        </Form>
      )}
    </Formik>
  );
};

export default EditPage;
