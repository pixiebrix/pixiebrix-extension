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

import styles from "./PackageReference.module.scss";

import React, { useEffect, useMemo, useState } from "react";
import {
  Col,
  Container,
  // eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
  Form,
  InputGroup,
  ListGroup,
  Row,
} from "react-bootstrap";
import Fuse from "fuse.js";
import { sortBy } from "lodash";
import Loader from "../../../../components/Loader";
import PackageDetail from "./PackageDetail";
import PackageResult from "./PackageResult";
import { isOfficial } from "../../../../bricks/util";
import { find as findPackage } from "../../../../registry/packageRegistry";
import { brickToYaml } from "../../../../utils/objToYaml";
import { useGetOrganizationsQuery } from "../../../../data/service/api";
import { type PackageInstance } from "../../../../types/registryTypes";
import useAsyncState from "../../../../hooks/useAsyncState";

type OwnProps<Instance extends PackageInstance> = {
  packageInstances: Instance[] | undefined;
  initialSelected?: Instance;
};

const PackageReference = ({
  packageInstances,
  initialSelected,
}: OwnProps<PackageInstance>) => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PackageInstance | undefined>(
    initialSelected,
  );
  const { data: organizations = [] } = useGetOrganizationsQuery();

  const sortedPackages = useMemo(
    () =>
      sortBy(
        packageInstances ?? [],
        (x) => (isOfficial(x.id) ? 0 : 1),
        (x) => x.name,
      ),
    [packageInstances],
  );

  useEffect(() => {
    if (sortedPackages.length > 0 && selected == null) {
      setSelected(sortedPackages[0]);
    }
  }, [sortedPackages, selected, setSelected]);

  const { data: packageConfig, isLoading: isPackageConfigLoading } =
    useAsyncState(async () => {
      if (!selected?.id) {
        return null;
      }

      const packageVersion = await findPackage(selected.id);
      if (packageVersion?.config) {
        delete packageVersion.config.sharing;
        return brickToYaml(packageVersion.config);
      }

      return null;
    }, [selected]);

  const fuse: Fuse<PackageInstance> = useMemo(
    () =>
      new Fuse(sortedPackages, {
        // Prefer name, then id
        keys: ["name", "id"],
      }),
    [sortedPackages],
  );

  const results = useMemo(() => {
    let matches =
      query.trim() === ""
        ? sortedPackages
        : fuse.search(query).map((x) => x.item);

    // If a brick is selected, have it show up at the top of the list
    if (selected && selected.id === initialSelected?.id) {
      matches = [selected, ...matches.filter((x) => x.id !== selected.id)];
    }

    return matches.slice(0, 10);
  }, [selected, initialSelected, query, fuse, sortedPackages]);

  return (
    <Container className="h-100" fluid>
      <Row className="h-100">
        <Col md={4} className="h-100 px-0">
          <InputGroup className="mr-sm-2">
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
          <ListGroup className={styles.blockResults}>
            {results.map((result) => (
              <PackageResult
                key={result.id}
                packageInstance={result}
                active={selected?.id === result.id}
                onSelect={() => {
                  setSelected(result);
                }}
                organizations={organizations}
              />
            ))}
          </ListGroup>
        </Col>
        <Col md={8} className={styles.detailColumn}>
          {selected ? (
            <PackageDetail
              packageInstance={selected}
              packageConfig={packageConfig}
              isPackageConfigLoading={isPackageConfigLoading}
            />
          ) : (
            <div>
              <Loader />
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default PackageReference;
