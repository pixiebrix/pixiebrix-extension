import styles from "./ListFilters.module.scss";

// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Form, Nav, type NavLinkProps } from "react-bootstrap";
import React, { useEffect, useState } from "react";
import useReduxState from "@/hooks/useReduxState";
import modsPageSlice, { type ActiveTab } from "./modsPageSlice";
import { selectActiveTab, selectSearchQuery } from "./modsPageSelectors";
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
import { type TableInstance } from "react-table";
import { type ModViewItem } from "@/types/modTypes";
import useFlags from "@/hooks/useFlags";
import {
  useGetMeQuery,
  useGetStarterBlueprintsQuery,
} from "@/data/service/api";
import { kebabCase } from "lodash";
import { type IconProp } from "@fortawesome/fontawesome-svg-core";

// eslint-disable-next-line no-restricted-imports -- Type only
import type { BsPrefixRefForwardingComponent } from "react-bootstrap/esm/helpers";
import useMilestones from "@/hooks/useMilestones";
import { type RegistryId } from "@/types/registryTypes";

import { MARKETPLACE_URL } from "@/urlConstants";
import { RestrictedFeatures } from "@/auth/featureFlags";

type ModsPageSidebarProps = {
  teamFilters: string[];
  tableInstance: TableInstance<ModViewItem>;
};

const MOD_TAB_KEYS = [
  "active",
  "all",
  "personal",
  "public",
  "getStarted",
] as const;
type ModTabKey = (typeof MOD_TAB_KEYS)[number];
type ModTabsMap = {
  [key in ModTabKey]: ActiveTab;
};

export const MODS_PAGE_TABS: ModTabsMap = {
  active: {
    key: "Active",
    tabTitle: "Active Mods",
    filters: [{ id: "status", value: "Active" }],
  },
  all: {
    key: "All",
    tabTitle: "All Mods",
    filters: [],
  },
  personal: {
    key: "Personal",
    tabTitle: "Personal Mods",
    filters: [{ id: "sharing.source.label", value: "Personal" }],
  },
  public: {
    key: "Public",
    tabTitle: "Public Mods",
    filters: [{ id: "sharing.source.label", value: "Public" }],
  },
  getStarted: {
    key: "Get Started",
    tabTitle: "Welcome to the PixieBrix Extension Console",
    filters: [],
    hideToolbar: true,
  },
};

const ListItem: BsPrefixRefForwardingComponent<
  "a",
  NavLinkProps & { label: string; icon: IconProp }
> = ({ label, icon, ...otherProps }) => (
  // @ts-expect-error -- react-bootstrap types are finicky in Typescript 5
  <Nav.Link
    className="media"
    data-testid={`${kebabCase(label)}-mod-tab`}
    {...otherProps}
  >
    <FontAwesomeIcon className="align-self-center" icon={icon} />
    <span className="media-body ml-2">{label}</span>
  </Nav.Link>
);

const useOnboardingTabs = (tableInstance: TableInstance<ModViewItem>) => {
  const { data: welcomeMods, isLoading: isWelcomeModsLoading } =
    useGetStarterBlueprintsQuery();
  const [activeTab, setActiveTab] = useReduxState(
    selectActiveTab,
    modsPageSlice.actions.setActiveTab,
  );
  const { data: modViewItems } = tableInstance;

  const {
    data: me,
    isLoading: isMeLoading,
    isFetching: isMeFetching,
  } = useGetMeQuery();
  const { getMilestone } = useMilestones();

  const onboardingModId = getMilestone("first_time_public_blueprint_install")
    ?.metadata?.blueprintId as RegistryId;

  const isFreemiumUser = !me?.primaryOrganization;

  const hasSomeModEngagement = modViewItems?.some((modViewItem) => {
    if (modViewItem.sharingSource.type === "Personal") {
      return true;
    }

    if (onboardingModId === modViewItem.modId) {
      return false;
    }

    const isWelcomeMod = welcomeMods?.some(
      (starterBlueprint) => modViewItem.modId === starterBlueprint.metadata.id,
    );

    return modViewItem.status === "Active" && !isWelcomeMod;
  });

  const showGetStartedTab =
    !isWelcomeModsLoading && !isMeLoading && !isMeFetching
      ? isFreemiumUser && !hasSomeModEngagement
      : false;

  useEffect(() => {
    if (isWelcomeModsLoading || isMeLoading || isMeFetching) {
      return;
    }

    if (activeTab.key == null) {
      if (showGetStartedTab) {
        setActiveTab(MODS_PAGE_TABS.getStarted);
        return;
      }

      setActiveTab(MODS_PAGE_TABS.active);
      return;
    }

    // The "Get Started" tab is an onboarding view that should only be
    // shown to new Freemium users that haven't engaged with the product yet.
    // If the "Get Started" tab is hidden due to e.g. onboarding completion,
    // but still selected as an ActiveTab, we want to reset the default to
    // the "Active Mods" tab.
    if (!showGetStartedTab && activeTab.key === "Get Started") {
      setActiveTab(MODS_PAGE_TABS.active);
    }
  }, [
    isMeLoading,
    isMeFetching,
    welcomeMods,
    isWelcomeModsLoading,
    activeTab.key,
    showGetStartedTab,
    setActiveTab,
  ]);

  return {
    showGetStartedTab,
  };
};

const ModsPageSidebar: React.VoidFunctionComponent<ModsPageSidebarProps> = ({
  teamFilters,
  tableInstance,
}) => {
  const { permit } = useFlags();
  const {
    state: { globalFilter },
    setGlobalFilter,
  } = tableInstance;
  const [activeTab, setActiveTab] = useReduxState(
    selectActiveTab,
    modsPageSlice.actions.setActiveTab,
  );
  const [_, setSearchQuery] = useReduxState(
    selectSearchQuery,
    modsPageSlice.actions.setSearchQuery,
  );
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearchInput] = useDebounce(searchInput, 300, {
    trailing: true,
    leading: false,
  });
  const { showGetStartedTab } = useOnboardingTabs(tableInstance);

  // By default, search everything with the option to re-select
  // filtered category
  useEffect(() => {
    if (globalFilter !== debouncedSearchInput) {
      setSearchQuery(debouncedSearchInput);
    }

    if (debouncedSearchInput) {
      setActiveTab(MODS_PAGE_TABS.all);
    }
  }, [globalFilter, debouncedSearchInput, setActiveTab, setGlobalFilter]);

  return (
    <div className={styles.root}>
      <Form>
        <Form.Control
          id="query"
          placeholder="Search all mods"
          size="sm"
          value={searchInput}
          data-testid="blueprints-search-input"
          onChange={({ target }) => {
            setSearchInput(target.value);
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
              setActiveTab(MODS_PAGE_TABS.getStarted);
            }}
          />
        )}
        <h5 className="mt-3">Category Filters</h5>
        <ListItem
          icon={faCheck}
          label="Active"
          eventKey="Active"
          onClick={() => {
            setActiveTab(MODS_PAGE_TABS.active);
          }}
        />
        <ListItem
          icon={faAsterisk}
          label="All Mods"
          eventKey="All"
          onClick={() => {
            setActiveTab(MODS_PAGE_TABS.all);
          }}
        />
        {permit(RestrictedFeatures.MARKETPLACE) && (
          <>
            <ListItem
              icon={faUser}
              label="Personal"
              eventKey="Personal"
              onClick={() => {
                setActiveTab(MODS_PAGE_TABS.personal);
              }}
            />
            <ListItem
              icon={faGlobe}
              label="Public Marketplace"
              eventKey="Public"
              onClick={() => {
                setActiveTab(MODS_PAGE_TABS.public);
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
                tabTitle: `${filter} Mods`,
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
          href={MARKETPLACE_URL}
          target="_blank"
          rel="noopener noreferrer"
        />
      </Nav>
    </div>
  );
};

export default ModsPageSidebar;
