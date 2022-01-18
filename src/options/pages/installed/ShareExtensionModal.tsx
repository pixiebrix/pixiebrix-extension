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
import React, { useCallback, useContext } from "react";
import {
  Button,
  Modal,
  Col,
  Form as BootstrapForm,
  Row,
} from "react-bootstrap";
import { FormikHelpers } from "formik";
import { compact, isEmpty, pick, sortBy, uniq } from "lodash";
import { IExtension, RegistryId, UUID } from "@/core";
import * as Yup from "yup";
import { PACKAGE_REGEX } from "@/types/helpers";
import AuthContext from "@/auth/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import slugify from "slugify";
import { getLinkedApiClient } from "@/services/apiClient";
import { objToYaml } from "@/utils/objToYaml";
import { makeBlueprint } from "@/options/pages/installed/exportBlueprint";
import { useDispatch } from "react-redux";
import { optionsSlice } from "@/options/slices";
import {
  RecipeDefinition,
  selectSourceRecipeMetadata,
} from "@/types/definitions";
import useNotifications from "@/hooks/useNotifications";
import { push } from "connected-react-router";
import { getHumanDetail } from "@/hooks/useUserAction";
import { isAxiosError } from "@/errors";
import { faGlobe, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import Form, {
  OnSubmit,
  RenderBody,
  RenderSubmit,
} from "@/components/form/Form";
import FieldTemplate from "@/components/form/FieldTemplate";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { useGetOrganizationsQuery } from "@/services/api";
import { PackageUpsertResponse } from "@/types/contract";
import { installedPageSlice } from "@/options/pages/installed/installedPageSlice";

const { attachExtension } = optionsSlice.actions;

type FormState = {
  blueprintId: RegistryId;
  name: string;
  description: string;
  public: boolean;
  organizations: UUID[];
};

const ShareSchema = Yup.object().shape({
  blueprintId: Yup.string()
    .matches(PACKAGE_REGEX, "Invalid registry id")
    .required(),
  name: Yup.string().required(),
  description: Yup.string().required(),
  public: Yup.boolean().required(),
  organizations: Yup.array().of(Yup.string().required()),
});

async function convertAndShare(
  extension: IExtension,
  form: FormState
): Promise<RecipeDefinition> {
  const client = await getLinkedApiClient();

  const blueprint = makeBlueprint(extension, {
    id: form.blueprintId,
    name: form.name,
    description: form.description,
    version: "1.0.0",
  });

  const { data } = await client.post<PackageUpsertResponse>("api/bricks/", {
    config: objToYaml(blueprint),
    kind: "recipe",
    public: form.public,
    organizations: form.organizations,
    share_dependencies: true,
  });

  return {
    ...blueprint,
    sharing: pick(data, ["public", "organizations"]),
    ...pick(data, ["updated_at"]),
  };
}

const ShareExtensionModal: React.FC<{
  extension: IExtension;
}> = ({ extension }) => {
  const notify = useNotifications();
  const dispatch = useDispatch();

  const onCancel = () => {
    dispatch(installedPageSlice.actions.setShareContext(null));
  };

  // If loading the URL directly, there's a race condition if scope will be populated when the modal is mounted.
  // Not a priority to fix because user will general come to the modal via the "Share" button on the main page
  const { scope } = useContext(AuthContext);
  const { data: organizations = [] } = useGetOrganizationsQuery();

  const initialValues: FormState = {
    blueprintId: compact([scope, slugify(extension.label).toLowerCase()]).join(
      "/"
    ) as RegistryId,
    name: extension.label,
    description: "",
    organizations: [],
    public: true,
  };

  const handleShare: OnSubmit = useCallback(
    async (values: FormState, helpers: FormikHelpers<FormState>) => {
      try {
        const recipe: RecipeDefinition = await convertAndShare(
          extension,
          values
        );
        dispatch(
          attachExtension({
            extensionId: extension.id,
            recipeMetadata: selectSourceRecipeMetadata(recipe),
          })
        );
        dispatch(push("/installed"));
        notify.success("Converted/shared brick");
      } catch (error) {
        if (isAxiosError(error) && error.response.data.config) {
          helpers.setStatus(error.response.data.config);
          return;
        }

        notify.error(
          `Error converting/sharing brick: ${getHumanDetail(error)}`,
          {
            error,
          }
        );
      } finally {
        helpers.setSubmitting(false);
      }
    },
    [dispatch, notify, extension]
  );

  const renderBody: RenderBody = ({ values, setFieldValue }) => (
    <Modal.Body>
      <ConnectedFieldTemplate
        name="name"
        layout="horizontal"
        label="Name"
        description="A name for the blueprint"
      />
      <ConnectedFieldTemplate
        name="blueprintId"
        layout="horizontal"
        label="Registry Id"
        description={
          <span>
            A unique id for the blueprint.{" "}
            <i>Cannot be modified once shared.</i>
          </span>
        }
      />
      <ConnectedFieldTemplate
        name="description"
        layout="horizontal"
        label="Description"
        description="A short description of the blueprint"
      />

      <BootstrapForm.Group as={Row}>
        <Col sm="12" className="text-info">
          <FontAwesomeIcon icon={faInfoCircle} /> The blueprint&apos;s
          dependencies will automatically also be shared.
        </Col>
      </BootstrapForm.Group>

      <ConnectedFieldTemplate
        name="public"
        layout="switch"
        label={
          values.public ? (
            <span>
              <FontAwesomeIcon icon={faGlobe} /> Public{" "}
              <span className="text-primary">
                <i> &ndash; visible to all PixieBrix users</i>
              </span>
            </span>
          ) : (
            <span>
              <FontAwesomeIcon icon={faGlobe} /> Public
            </span>
          )
        }
      />

      {sortBy(organizations, (organization) => organization.name).map(
        (organization) => {
          const checked = values.organizations.includes(organization.id);
          return (
            <FieldTemplate
              key={organization.id}
              name={organization.id}
              layout="switch"
              label={organization.name}
              value={checked}
              onChange={() => {
                const next = checked
                  ? values.organizations.filter(
                      (x: string) => x !== organization.id
                    )
                  : uniq([...values.organizations, organization.id]);
                setFieldValue("organizations", next);
              }}
            />
          );
        }
      )}
    </Modal.Body>
  );

  const renderSubmit: RenderSubmit = ({ isSubmitting, isValid, values }) => (
    <Modal.Footer>
      <Button variant="link" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" disabled={!isValid || isSubmitting}>
        {values.public || !isEmpty(values.organizations) ? "Share" : "Convert"}
      </Button>
    </Modal.Footer>
  );

  return (
    <Modal show onHide={onCancel}>
      <Modal.Header>
        <Modal.Title>Share as Blueprint</Modal.Title>
      </Modal.Header>
      <Form
        validationSchema={ShareSchema}
        initialValues={initialValues}
        onSubmit={handleShare}
        renderBody={renderBody}
        renderSubmit={renderSubmit}
      />
    </Modal>
  );
};

export default ShareExtensionModal;
