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
import { Button, Col, Form, Row } from "react-bootstrap";
import { Formik, useField } from "formik";
import { useFetch } from "@/hooks/fetch";
import { useParams } from "react-router";
import Editor from "./Editor";
import { truncate } from "lodash";
import GridLoader from "react-spinners/GridLoader";
import useSubmitBrick from "./useSubmitBrick";
import yaml from "js-yaml";
import BootstrapSwitchButton from "bootstrap-switch-button-react";
import "./EditPage.scss";
import { useSelector } from "react-redux";
import { MessageContext, RawConfig } from "@/core";
import { useDebounce } from "use-debounce";
import { selectExtensions } from "@/options/selectors";
import { useTitle } from "@/hooks/title";
import { HotKeys } from "react-hotkeys";

interface BrickData {
  id: string;
  config: string;
  organizations: string[];
  public: boolean;
}

type ParsedBrickInfo = {
  isBlueprint: boolean;
  isInstalled: boolean;
  config: RawConfig;
};

function useParseBrick(config: string | null): ParsedBrickInfo {
  const extensions = useSelector(selectExtensions);

  return useMemo(() => {
    if (config == null) {
      return { isBlueprint: false, isInstalled: false, config: undefined };
    }
    const configJSON = yaml.safeLoad(config) as RawConfig;
    const isBlueprint = configJSON.kind === "recipe";
    if (isBlueprint) {
      return {
        isBlueprint: true,
        isInstalled: extensions.some(
          (x) => x._recipeId === configJSON.metadata?.id
        ),
        config: configJSON,
      };
    } else {
      return { isBlueprint: false, isInstalled: false, config: undefined };
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
  const [debouncedConfig] = useDebounce(config, 250);
  const installed = useSelector(selectExtensions);

  const blueprintMap = useMemo(() => {
    return new Map<string, string>(
      installed
        .filter((x) => x._recipe != null)
        .map((x) => [x._recipe.id, x.id])
    );
  }, [installed]);

  return useMemo(() => {
    try {
      const json = yaml.safeLoad(debouncedConfig) as RawConfig;
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

const LoadingBody: React.FunctionComponent = () => {
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
};

const keyMap = {
  SAVE: "command+s",
};

const EditPage: React.FunctionComponent = () => {
  const { id } = useParams<{ id: string }>();

  const url = `api/bricks/${id}/`;

  const data = useFetch<BrickData>(url);

  const { isBlueprint, isInstalled, config: rawConfig } = useParseBrick(
    data?.config
  );

  const { submit, validate, remove } = useSubmitBrick({ url, create: false });

  const logContext = useLogContext(data?.config);

  const name = rawConfig?.metadata?.name;
  const title = useMemo(
    () => (name ? `Edit ${truncate(name, { length: 15 })}` : "Edit Brick"),
    [name]
  );
  useTitle(title);

  if (!data) {
    return <LoadingBody />;
  }

  return (
    <HotKeys keyMap={keyMap}>
      <Formik
        onSubmit={submit}
        validate={validate}
        initialValues={{ ...data, reactivate: isBlueprint && isInstalled }}
      >
        {({ values, isValid, handleSubmit, isSubmitting }) => (
          <HotKeys
            handlers={{
              SAVE: (keyEvent) => {
                keyEvent.preventDefault();
                handleSubmit();
              },
            }}
          >
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
                <Col className="mt-4">
                  <Editor logContext={logContext} />
                </Col>
              </Row>
            </Form>
          </HotKeys>
        )}
      </Formik>
    </HotKeys>
  );
};

export default EditPage;
