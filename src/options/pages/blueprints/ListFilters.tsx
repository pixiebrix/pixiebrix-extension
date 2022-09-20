import styles from "./ListFilters.module.scss";

import { Col, Form, Nav } from "react-bootstrap";
import React, { useEffect, useState } from "react";
import useReduxState from "@/hooks/useReduxState";
import { selectActiveTab } from "./blueprintsSelectors";
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
  const { data: starterBlueprints, isLoading: isStarterBlueprintsLoading } =
    useGetStarterBlueprintsQuery();
  const { setGlobalFilter, data: installableViewItems } = tableInstance;
  const [activeTab, setActiveTab] = useReduxState(
    selectActiveTab,
    blueprintsSlice.actions.setActiveTab
  );
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 300, {
    trailing: true,
    leading: false,
  });

  const isFreemiumUser = onboardingType === "default";

  const hasSomeBlueprintEngagement = installableViewItems?.some(
    (installableViewItem) => {
      if (installableViewItem.sharing.source.type === "Personal") {
        return true;
      }

      const isNotStarterBlueprint = starterBlueprints?.some(
        (starterBlueprint) =>
          installableViewItem.sharing.packageId !== starterBlueprint.metadata.id
      );

      return installableViewItem.status === "Active" && isNotStarterBlueprint;
    }
  );

  const showGetStartedTab =
    !isStarterBlueprintsLoading && !isOnboardingLoading
      ? isFreemiumUser && !hasSomeBlueprintEngagement
      : false;

  useEffect(() => {
    if (
      isStarterBlueprintsLoading ||
      isOnboardingLoading ||
      showGetStartedTab
    ) {
      return;
    }

    // The "Get Started" tab is an onboarding view that should only be
    // shown to new Freemium users that haven't engaged with the product yet.
    // If the "Get Started" tab is hidden due to e.g. onboarding completion,
    // but still selected as an ActiveTab, we want to reset the default to
    // the "Active Blueprints" tab.
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
      setActiveTab({
        key: "All",
        tabTitle: "All Blueprints",
        filters: [],
      });
    }
  }, [debouncedQuery, setActiveTab, setGlobalFilter]);

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
                  filters: [],
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
