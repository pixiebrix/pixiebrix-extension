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

import styles from "./PackageHistory.module.scss";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Select, {
  components,
  type OptionProps,
  type SingleValueProps,
} from "react-select";
import DiffEditor from "@/components/DiffEditor";
import objectHash from "object-hash";
import { type UUID } from "@/types/stringTypes";
import {
  useGetPackageQuery,
  useListPackageVersionsQuery,
} from "@/data/service/api";

export interface PackageVersionOption {
  value: string;
  label: string;
  updated_at: string;
}

const { Option, SingleValue } = components;

const Content: React.FunctionComponent<{
  data: PackageVersionOption;
}> = ({ data }) => (
  <div className="d-flex align-items-center">
    <span>{data.label}&nbsp;</span>{" "}
    <span className="small text-muted">{data.updated_at}</span>
  </div>
);

const CustomSingleValue: React.FunctionComponent<
  SingleValueProps<PackageVersionOption, false>
> = (props) => (
  <SingleValue {...props}>
    <Content data={props.data} />
  </SingleValue>
);

const CustomSingleOption: React.FunctionComponent<
  OptionProps<PackageVersionOption, false>
> = (props) => (
  <Option {...props}>
    <Content data={props.data} />
  </Option>
);

const PackageHistory: React.FunctionComponent<{
  packageId: UUID;
}> = ({ packageId }) => {
  const { data: editablePackage } = useGetPackageQuery({ id: packageId });
  const { data: packageVersions } = useListPackageVersionsQuery({
    packageId,
  });

  const versionOptions = useMemo<PackageVersionOption[]>(
    () =>
      (packageVersions ?? []).map((packageVersion) => {
        const label = `${packageVersion.version}${
          packageVersion.version === editablePackage?.version
            ? " (current)"
            : ""
        }`;
        const baseOption: PackageVersionOption = {
          value: packageVersion.version ?? "",
          label,
          updated_at: "",
        };
        if (packageVersion.updated_at == null) {
          return baseOption;
        }

        const date = new Date(packageVersion.updated_at);
        const formatted_date = `${
          date.getMonth() + 1
        }/${date.getDate()}/${date.getFullYear()}`;
        return {
          ...baseOption,
          updated_at: formatted_date,
        };
      }),
    [packageVersions, editablePackage],
  );

  const currentVersion = useMemo(
    () => versionOptions.find((option) => option.label.includes("current")),
    [versionOptions],
  );

  const [versionA, setVersionA] = useState<PackageVersionOption | undefined>();
  const [versionB, setVersionB] = useState<PackageVersionOption | undefined>();

  useEffect(() => {
    setVersionA(currentVersion);
  }, [currentVersion]);

  // We look up the large rawConfig up separately instead of including it in the versionOptions array because
  // it's a large string, and it causes the UI to hang.
  // TODO: use a specific endpoint for fetching just version metadata without the entire mod config
  //   https://github.com/pixiebrix/pixiebrix-extension/issues/7692
  const versionARawConfig = useMemo(
    () =>
      packageVersions?.find((version) => version.version === versionA?.value)
        ?.raw_config,
    [packageVersions, versionA?.value],
  );
  const versionBRawConfig = useMemo(
    () =>
      packageVersions?.find((version) => version.version === versionB?.value)
        ?.raw_config,
    [packageVersions, versionB?.value],
  );

  return (
    <div>
      <div className="p-3">
        <p>
          Compare past versions of this package by selecting the versions below.
        </p>
        <div className="d-flex justify-content-start">
          <Select
            className={styles.versionSelector}
            placeholder="Select a version"
            data-testid="versionASelect"
            options={versionOptions}
            value={versionA}
            onChange={(option: PackageVersionOption) => {
              setVersionA(option);
            }}
            components={{
              Option: CustomSingleOption,
              SingleValue: CustomSingleValue,
            }}
          />
          <Select
            className={styles.versionSelector}
            placeholder="Select a version"
            options={versionOptions}
            onChange={(option: PackageVersionOption) => {
              setVersionB(option);
            }}
            components={{
              Option: CustomSingleOption,
              SingleValue: CustomSingleValue,
            }}
          />
        </div>
      </div>
      {versionARawConfig && versionBRawConfig && (
        <Suspense fallback={<div>Loading history...</div>}>
          <DiffEditor
            value={[versionARawConfig, versionBRawConfig]}
            key={objectHash({ a: versionA, b: versionB })}
            width="100%"
            theme="chrome"
            mode="yaml"
            name="DIFF_EDITOR_DIV"
            readOnly
          />
        </Suspense>
      )}
    </div>
  );
};

export default PackageHistory;
