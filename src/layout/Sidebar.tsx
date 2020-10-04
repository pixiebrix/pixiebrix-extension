import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { NavLink } from "react-router-dom";
import {
  faCloud,
  faCogs,
  faCubes,
  faHammer,
  faStoreAlt,
} from "@fortawesome/free-solid-svg-icons";
import cx from "classnames";
import { useLocation } from "react-router";
import { Location } from "history";
import { IconProp } from "@fortawesome/fontawesome-svg-core";

interface LinkProps {
  isActive?: (match: any, location: Location) => boolean;
  title: string;
  icon: IconProp;
  route: string;
}

const SidebarLink: React.FunctionComponent<LinkProps> = ({
  route,
  title,
  icon,
  isActive,
}) => {
  const location = useLocation();
  return (
    <li
      className={cx("nav-item", {
        active:
          location.pathname.startsWith(route) ||
          (isActive && isActive(null, location)),
      })}
    >
      <NavLink to={route} className="nav-link" isActive={isActive}>
        <span className="menu-title">{title}</span>
        <FontAwesomeIcon icon={icon} className="menu-icon" />
      </NavLink>
    </li>
  );
};

const Sidebar = () => (
  <nav className="sidebar sidebar-offcanvas" id="sidebar">
    <ul className="nav">
      <SidebarLink
        route="/installed"
        title="Active Bricks"
        icon={faCubes}
        isActive={(match, location) =>
          match ||
          location.pathname === "/" ||
          location.pathname.startsWith("/extensions/")
        }
      />
      <SidebarLink route="/marketplace" title="Marketplace" icon={faStoreAlt} />
      <SidebarLink route="/workshop" title="Workshop" icon={faHammer} />
      {/*<ConnectedNavLink route="build" title="Build Brick" icon={faTools} />*/}
      <SidebarLink
        route="/services"
        title="Configure Services"
        icon={faCloud}
      />
      <SidebarLink route="/settings" title="Settings" icon={faCogs} />
    </ul>
  </nav>
);

export default Sidebar;
