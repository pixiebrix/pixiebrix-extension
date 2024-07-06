/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import React, { useMemo, useState } from "react";
import Page from "@/layout/Page";
import { faHammer, faPlus, faTimes } from "@fortawesome/free-solid-svg-icons";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Button, Form, InputGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { isEmpty, orderBy, sortBy, uniq } from "lodash";
import Select from "react-select";
import workshopSlice, { type WorkshopState } from "@/store/workshopSlice";
import { connect, useDispatch, useSelector } from "react-redux";
import Fuse from "fuse.js";
import { push } from "connected-react-router";
import EditablePackagesCard from "./EditablePackagesCard";
import {
  type EnrichedPackageMetadata,
  type NavigateProps,
} from "./workshopTypes";
import { RequireScope } from "@/auth/RequireScope";
import { mapKindToKindUiValue } from "@/extensionConsole/pages/workshop/workshopUtils";
import { PACKAGE_REGEX } from "@/types/helpers";
import { useGetEditablePackagesQuery } from "@/data/service/api";
import { type EditablePackageMetadata } from "@/types/contract";
import { type Nullishable } from "@/utils/nullishUtils";

const { actions } = workshopSlice;

function selectRecent(state: { workshop: WorkshopState }) {
  return new Map((state.workshop.recent ?? []).map((x) => [x.id, x.timestamp]));
}

function selectFilters(state: { workshop: WorkshopState }) {
  return state.workshop.filters;
}

export function useEnrichPackageMetadata(
  editablePackages: Nullishable<EditablePackageMetadata[]>,
): EnrichedPackageMetadata[] {
  const recent = useSelector(selectRecent);

  return useMemo(() => {
    console.debug("Recent packages", { recent });

    return orderBy(
      (editablePackages ?? []).map((editablePackage) => {
        const match = PACKAGE_REGEX.exec(editablePackage.name);

        const { scope, collection } = match?.groups ?? {};

        return {
          ...editablePackage,
          scope,
          collection,
          timestamp: recent.get(editablePackage.id) ?? null,
        };
      }),
      // Show recently accessed first
      [(x) => x.timestamp ?? -1, (x) => x.verbose_name],
      ["desc", "asc"],
    );
  }, [recent, editablePackages]);
}

export function useSearchOptions(packages: EnrichedPackageMetadata[]) {
  const scopeOptions = useMemo(
    () =>
      sortBy(uniq((packages ?? []).map((x) => x.scope))).map((value) => ({
        value,
        label: value ?? "[No Scope]",
      })),
    [packages],
  );

  const collectionOptions = useMemo(
    () =>
      sortBy(uniq((packages ?? []).map((x) => x.collection))).map((value) => ({
        value,
        label: value ?? "[No Collection]",
      })),
    [packages],
  );

  const kindOptions = useMemo(
    () =>
      sortBy(
        uniq((packages ?? []).map((x) => mapKindToKindUiValue(x.kind))),
      ).map((value) => ({
        value,
        label: value,
      })),
    [packages],
  );

  return {
    scopeOptions,
    collectionOptions,
    kindOptions,
  };
}

const CustomBricksSection: React.FunctionComponent<NavigateProps> = ({
  navigate,
}) => {
  const dispatch = useDispatch();
  const [query, setQuery] = useState("");

  const {
    data: editablePackages,
    isLoading,
    error,
  } = useGetEditablePackagesQuery(undefined, {
    // Make sure user always see the latest bricks available (e.g., because they just saved a mod in the page editor)
    refetchOnMountOrArgChange: true,
  });

  const {
    scopes = [],
    collections = [],
    kinds = [],
  } = useSelector(selectFilters);

  const enrichPackages = useEnrichPackageMetadata(editablePackages);
  const { scopeOptions, kindOptions, collectionOptions } =
    useSearchOptions(enrichPackages);

  const filtered = !isEmpty(scopes) || !isEmpty(collections) || !isEmpty(kinds);

  const fuse: Fuse<EnrichedPackageMetadata> = useMemo(
    () =>
      new Fuse(enrichPackages, {
        keys: ["verbose_name", "name"],
      }),
    [enrichPackages],
  );

  const sortedPackages = useMemo(() => {
    const results =
      query.trim() === ""
        ? enrichPackages
        : fuse.search(query).map((x) => x.item);

    return results.filter(
      (x) =>
        (scopes.length === 0 || (x.scope && scopes.includes(x.scope))) &&
        (collections.length === 0 ||
          (x.collection && collections.includes(x.collection))) &&
        (kinds.length === 0 || kinds.includes(mapKindToKindUiValue(x.kind))),
    );
  }, [fuse, query, scopes, collections, kinds, enrichPackages]);

  return (
    <div className="max-950">
      <Form>
        <InputGroup className="mb-2 mr-sm-2">
          <InputGroup.Prepend>
            <InputGroup.Text>Search</InputGroup.Text>
          </InputGroup.Prepend>
          <Form.Control
            id="query"
            placeholder="Start typing to find results"
            value={query}
            onChange={({ target }) => {
              setQuery(target.value);
            }}
          />
        </InputGroup>
      </Form>

      <div className="d-flex">
        <div style={{ width: 200 }}>
          <Select
            isMulti
            placeholder="Filter @scope"
            options={scopeOptions}
            value={scopeOptions.filter(
              (x) => x.value && scopes.includes(x.value),
            )}
            onChange={(values) => {
              dispatch(actions.setScopes((values ?? []).map((x) => x.value)));
            }}
          />
        </div>
        <div style={{ width: 200 }} className="ml-3">
          <Select
            isMulti
            placeholder="Filter collection"
            options={collectionOptions}
            value={collectionOptions.filter(
              (x) => x.value && collections.includes(x.value),
            )}
            onChange={(values) => {
              dispatch(
                actions.setCollections((values ?? []).map((x) => x.value)),
              );
            }}
          />
        </div>
        <div style={{ width: 200 }} className="ml-3">
          <Select
            isMulti
            placeholder="Filter type"
            options={kindOptions}
            value={kindOptions.filter((x) => kinds.includes(x.value))}
            onChange={(values) => {
              dispatch(actions.setKinds((values ?? []).map((x) => x.value)));
            }}
          />
        </div>
        <div className="ml-3">
          {filtered && (
            <Button
              variant="info"
              size="sm"
              style={{ height: "36px", marginTop: "1px" }}
              onClick={() => {
                dispatch(actions.clearFilters());
              }}
            >
              <FontAwesomeIcon icon={faTimes} /> Reset Filters
            </Button>
          )}
        </div>
      </div>
      <div className="mt-4">
        <EditablePackagesCard
          navigate={navigate}
          packages={sortedPackages}
          isFetching={isLoading}
          error={error}
        />
      </div>
    </div>
  );
};

const WorkshopPage: React.FunctionComponent<NavigateProps> = ({ navigate }) => (
  <RequireScope
    scopeSettingsTitle="Welcome to the PixieBrix Workshop!"
    scopeSettingsDescription="To use the Workshop, you must first set an account alias for your PixieBrix account"
  >
    <Page
      title="Workshop"
      icon={faHammer}
      description={
        <p>
          Text-based editor for advanced users to create and edit registry
          packages. Mods created with the Page Editor can also be edited here
        </p>
      }
      documentationUrl="https://docs.pixiebrix.com/developing-mods/advanced-workshop"
      toolbar={
        <Button
          variant="primary"
          onClick={() => {
            navigate("/workshop/create/");
          }}
        >
          <FontAwesomeIcon icon={faPlus} /> Create New Package
        </Button>
      }
    >
      <CustomBricksSection navigate={navigate} />
    </Page>
  </RequireScope>
);

const mapDispatchToProps = { navigate: push };

export default connect(undefined, mapDispatchToProps)(WorkshopPage);
