import styles from "./ListFilters.module.scss";

import { Col, Form, Nav } from "react-bootstrap";
import React, { useEffect, useMemo, useState } from "react";
import useReduxState from "@/hooks/useReduxState";
import { selectActiveTab, selectFilters } from "./blueprintsSelectors";
import blueprintsSlice from "./blueprintsSlice";
import { useDebounce } from "use-debounce";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAsterisk,
  faCheck,
  faExternalLinkAlt,
  faGlobe,
  faRocket,
  faUser,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { TableInstance } from "react-table";
import { InstallableViewItem } from "@/options/pages/blueprints/blueprintsTypes";
import useFlags from "@/hooks/useFlags";
import useOnboarding from "@/options/pages/blueprints/onboardingView/useOnboarding";
import { useGetStarterBlueprintsQuery } from "@/services/api";

type ListFiltersProps = {
  teamFilters: string[];
  tableInstance: TableInstance<InstallableViewItem>;
};

function ListFilters({ teamFilters, tableInstance }: ListFiltersProps) {
  const { permit } = useFlags();
  const { onboardingType, isLoading: isOnboardingLoading } = useOnboarding();
  const starterBlueprints = useGetStarterBlueprintsQuery();
  const { setGlobalFilter, data: installableViewItems } = tableInstance;
  const [_, setFilters] = useReduxState(
    selectFilters,
    blueprintsSlice.actions.setFilters
  );
  const [activeTab, setActiveTab] = useReduxState(
    selectActiveTab,
    blueprintsSlice.actions.setActiveTab
  );
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 300, {
    trailing: true,
    leading: false,
  });

  const showGetStartedTab = useMemo(() => {
    const isFreemiumUser = onboardingType === "default";

    const hasSomeBlueprintEngagement = installableViewItems.some(
      (installableViewItem) => {
        if (installableViewItem.sharing.source.type === "Personal") {
          return true;
        }

        const isNotStarterBlueprint = !starterBlueprints.data.some(
          (starterBlueprint) =>
            installableViewItem.sharing.packageId ===
            starterBlueprint.metadata.id
        );

        return installableViewItem.status === "Active" && isNotStarterBlueprint;
      }
    );

    return !starterBlueprints.isLoading && !isOnboardingLoading
      ? isFreemiumUser && !hasSomeBlueprintEngagement
      : false;
  }, [
    onboardingType,
    installableViewItems,
    starterBlueprints.isLoading,
    starterBlueprints.data,
    isOnboardingLoading,
  ]);

  useEffect(() => {
    if (
      starterBlueprints.isLoading ||
      isOnboardingLoading ||
      showGetStartedTab
    ) {
      return;
    }

    if (activeTab.key === "Get Started") {
      setActiveTab({
        key: "Active",
        tabTitle: "Active Blueprints",
        filters: [{ id: "status", value: "Active" }],
      });
    }
  }, [
    isOnboardingLoading,
    starterBlueprints,
    showGetStartedTab,
    activeTab,
    setActiveTab,
  ]);

  // By default, search everything with the option to re-select
  // filtered category
  useEffect(() => {
    setGlobalFilter(debouncedQuery);

    if (debouncedQuery) {
      setFilters([]);
    }
  }, [debouncedQuery, setFilters, setGlobalFilter]);

  return (
    <Col sm={12} md={3} xl={2} className={styles.root}>
      <Form className="mr-3">
        <Form.Control
          id="query"
          placeholder="Search all blueprints"
          size="sm"
          value={query}
          onChange={({ target }) => {
            setQuery(target.value);
          }}
        />
      </Form>
      <Nav
        className="flex-column"
        variant="pills"
        defaultActiveKey={activeTab.key}
        activeKey={activeTab.key}
      >
        {showGetStartedTab && (
          <Nav.Item className="mt-3">
            <Nav.Link
              eventKey="Get Started"
              onClick={() => {
                setActiveTab({
                  key: "Get Started",
                  tabTitle: "Welcome to the PixieBrix Extension Console",
                });
              }}
            >
              <FontAwesomeIcon icon={faRocket} /> Get Started
            </Nav.Link>
          </Nav.Item>
        )}
        <h5 className="mt-3">Category Filters</h5>
        <Nav.Item>
          <Nav.Link
            eventKey="Active"
            onClick={() => {
              setFilters([{ id: "status", value: "Active" }]);
              setActiveTab({
                key: "Active",
                tabTitle: "Active Blueprints",
                filters: [{ id: "status", value: "Active" }],
              });
            }}
          >
            <FontAwesomeIcon icon={faCheck} /> Active
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            eventKey="All"
            onClick={() => {
              setFilters([]);
              setActiveTab({
                key: "All",
                tabTitle: "All Blueprints",
                filters: [],
              });
            }}
          >
            <FontAwesomeIcon icon={faAsterisk} /> All Blueprints
          </Nav.Link>
        </Nav.Item>
        {permit("marketplace") && (
          <>
            <Nav.Item>
              <Nav.Link
                eventKey="Personal"
                onClick={() => {
                  setFilters([
                    { id: "sharing.source.label", value: "Personal" },
                  ]);
                  setActiveTab({
                    key: "Personal",
                    tabTitle: "Personal Blueprints",
                    filters: [
                      { id: "sharing.source.label", value: "Personal" },
                    ],
                  });
                }}
              >
                <FontAwesomeIcon icon={faUser} /> Personal
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                eventKey="Public"
                onClick={() => {
                  setFilters([{ id: "sharing.source.label", value: "Public" }]);
                  setActiveTab({
                    key: "Public",
                    tabTitle: "Public Blueprints",
                    filters: [{ id: "sharing.source.label", value: "Public" }],
                  });
                }}
              >
                <FontAwesomeIcon icon={faGlobe} /> Public Marketplace
              </Nav.Link>
            </Nav.Item>
          </>
        )}
        {teamFilters.length > 0 && <h5 className="mt-3">Shared with Me</h5>}
        {teamFilters.map((filter) => (
          <Nav.Item key={filter}>
            <Nav.Link
              eventKey={filter}
              onClick={() => {
                setFilters([{ id: "sharing.source.label", value: filter }]);
                setActiveTab({
                  key: filter,
                  tabTitle: `${filter} Blueprints`,
                  filters: [{ id: "sharing.source.label", value: filter }],
                });
              }}
            >
              <FontAwesomeIcon icon={faUsers} /> {filter}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>
      <Nav className="flex-column">
        <h5>Explore</h5>
        <Nav.Item>
          <Nav.Link
            href="https://www.pixiebrix.com/marketplace"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} /> Open Public Marketplace
          </Nav.Link>
        </Nav.Item>
      </Nav>
    </Col>
  );
}

export default ListFilters;
