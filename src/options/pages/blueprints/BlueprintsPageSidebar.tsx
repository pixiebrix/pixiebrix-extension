import styles from "./ListFilters.module.scss";

import { Col, Form, Nav, NavLinkProps } from "react-bootstrap";
import React, { useEffect, useState } from "react";
import useReduxState from "@/hooks/useReduxState";
import { selectActiveTab, selectSearchQuery } from "./blueprintsSelectors";
import blueprintsSlice, { ActiveTab } from "./blueprintsSlice";
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
import { useGetMeQuery, useGetStarterBlueprintsQuery } from "@/services/api";
import { IconProp } from "@fortawesome/fontawesome-svg-core";

// eslint-disable-next-line no-restricted-imports -- Type only
import type { BsPrefixRefForwardingComponent } from "react-bootstrap/esm/helpers";
import useMilestones from "@/hooks/useMilestones";

type BlueprintsPageSidebarProps = {
  teamFilters: string[];
  tableInstance: TableInstance<InstallableViewItem>;
};

const BLUEPRINT_TAB_KEYS = [
  "active",
  "all",
  "personal",
  "public",
  "getStarted",
  "botGames",
] as const;
type BlueprintTabKey = typeof BLUEPRINT_TAB_KEYS[number];
type BlueprintTabMap = {
  [key in BlueprintTabKey]: ActiveTab;
};

export const BLUEPRINTS_PAGE_TABS: BlueprintTabMap = {
  active: {
    key: "Active",
    tabTitle: "Active Blueprints",
    filters: [{ id: "status", value: "Active" }],
  },
  all: {
    key: "All",
    tabTitle: "All Blueprints",
    filters: [],
  },
  personal: {
    key: "Personal",
    tabTitle: "Personal Blueprints",
    filters: [{ id: "sharing.source.label", value: "Personal" }],
  },
  public: {
    key: "Public",
    tabTitle: "Public Blueprints",
    filters: [{ id: "sharing.source.label", value: "Public" }],
  },
  getStarted: {
    key: "Get Started",
    tabTitle: "Welcome to the PixieBrix Extension Console",
    filters: [],
  },
  botGames: {
    key: "Bot Games",
    tabTitle: "Finish your Bot Games setup",
    filters: [],
  },
};

const ListItem: BsPrefixRefForwardingComponent<
  "a",
  NavLinkProps & { label: string; icon: IconProp }
> = ({ label, icon, ...otherProps }) => (
  <Nav.Link className="media" {...otherProps}>
    <FontAwesomeIcon className="align-self-center" icon={icon} />
    <span className="media-body ml-2">{label}</span>
  </Nav.Link>
);

const BlueprintsPageSidebar: React.FunctionComponent<
  BlueprintsPageSidebarProps
> = ({ teamFilters, tableInstance }) => {
  const { permit } = useFlags();
  const { data: me, isLoading: isMeLoading } = useGetMeQuery();
  const { hasMilestone } = useMilestones();
  const { data: starterBlueprints, isLoading: isStarterBlueprintsLoading } =
    useGetStarterBlueprintsQuery();
  const {
    state: { globalFilter },
    setGlobalFilter,
    data: installableViewItems,
  } = tableInstance;
  const [activeTab, setActiveTab] = useReduxState(
    selectActiveTab,
    blueprintsSlice.actions.setActiveTab
  );
  const [_, setSearchQuery] = useReduxState(
    selectSearchQuery,
    blueprintsSlice.actions.setSearchQuery
  );
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 300, {
    trailing: true,
    leading: false,
  });

  const isFreemiumUser = !me?.organization;

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
    !isStarterBlueprintsLoading && !isMeLoading
      ? isFreemiumUser && !hasSomeBlueprintEngagement
      : false;

  // const showBotGamesTab = hasMilestone("bot_games_2022_register");
  const showBotGamesTab = process.env.BOT_GAMES_EVENT_IN_PROGRESS;

  useEffect(() => {
    if (isStarterBlueprintsLoading || isMeLoading) {
      return;
    }

    if (activeTab.key === null) {
      if (showGetStartedTab) {
        setActiveTab(BLUEPRINTS_PAGE_TABS.getStarted);
        return;
      }

      setActiveTab(BLUEPRINTS_PAGE_TABS.active);
      return;
    }

    // The "Get Started" tab is an onboarding view that should only be
    // shown to new Freemium users that haven't engaged with the product yet.
    // If the "Get Started" tab is hidden due to e.g. onboarding completion,
    // but still selected as an ActiveTab, we want to reset the default to
    // the "Active Blueprints" tab.
    if (!showGetStartedTab && activeTab.key === "Get Started") {
      setActiveTab(BLUEPRINTS_PAGE_TABS.active);
    }
  }, [
    isMeLoading,
    starterBlueprints,
    isStarterBlueprintsLoading,
    activeTab.key,
    showGetStartedTab,
    setActiveTab,
  ]);

  // By default, search everything with the option to re-select
  // filtered category
  useEffect(() => {
    if (globalFilter !== debouncedQuery) {
      setSearchQuery(debouncedQuery);
    }

    if (debouncedQuery) {
      setActiveTab(BLUEPRINTS_PAGE_TABS.all);
    }
  }, [globalFilter, debouncedQuery, setActiveTab, setGlobalFilter]);

  return (
    <Col sm={12} md={3} xl={2} className={styles.root}>
      <Form>
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
          <ListItem
            className="mt-3"
            icon={faRocket}
            label="Get Started"
            eventKey="Get Started"
            onClick={() => {
              setActiveTab(BLUEPRINTS_PAGE_TABS.getStarted);
            }}
          />
        )}
        {showBotGamesTab && (
          <ListItem
            className="mt-3"
            icon={faRocket}
            label="Bot Games"
            eventKey="Bot Games"
            onClick={() => {
              setActiveTab(BLUEPRINTS_PAGE_TABS.botGames);
            }}
          />
        )}
        <h5 className="mt-3">Category Filters</h5>
        <ListItem
          icon={faCheck}
          label="Active"
          eventKey="Active"
          onClick={() => {
            setActiveTab(BLUEPRINTS_PAGE_TABS.active);
          }}
        />
        <ListItem
          icon={faAsterisk}
          label="All Blueprints"
          eventKey="All"
          onClick={() => {
            setActiveTab(BLUEPRINTS_PAGE_TABS.all);
          }}
        />
        {permit("marketplace") && (
          <>
            <ListItem
              icon={faUser}
              label="Personal"
              eventKey="Personal"
              onClick={() => {
                setActiveTab(BLUEPRINTS_PAGE_TABS.personal);
              }}
            />
            <ListItem
              icon={faGlobe}
              label="Public Marketplace"
              eventKey="Public"
              onClick={() => {
                setActiveTab(BLUEPRINTS_PAGE_TABS.public);
              }}
            />
          </>
        )}
        {teamFilters.length > 0 && <h5 className="mt-3">Shared with Me</h5>}
        {teamFilters.map((filter) => (
          <ListItem
            key={filter}
            icon={faUsers}
            label={filter}
            eventKey={filter}
            onClick={() => {
              setActiveTab({
                key: filter,
                tabTitle: `${filter} Blueprints`,
                filters: [{ id: "sharing.source.label", value: filter }],
              });
            }}
          />
        ))}
      </Nav>
      <Nav className="flex-column">
        <h5>Explore</h5>
        <ListItem
          icon={faExternalLinkAlt}
          label="Open Public Marketplace"
          href="https://www.pixiebrix.com/marketplace"
          target="_blank"
          rel="noopener noreferrer"
        />
      </Nav>
    </Col>
  );
};

export default BlueprintsPageSidebar;
