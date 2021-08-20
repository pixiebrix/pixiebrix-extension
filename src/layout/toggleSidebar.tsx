import { sidebarId } from "./Sidebar";

const smallScreenMediaQuery = "(max-width: 991px)";
const sidebarActiveClassName = "active"; // Used to show/hide navbar on small screen
const sidebarIconOnlyClassName = "sidebar-icon-only"; // Used to show/hide navbar on big screen

export const toggleSidebar = () => {
  if (window.matchMedia(smallScreenMediaQuery).matches) {
    document
      .querySelector(`#${sidebarId}`)
      .classList.toggle(sidebarActiveClassName);
  } else {
    document.body.classList.toggle(sidebarIconOnlyClassName);
  }
};

export const closeSidebaronSmallScreen = () => {
  if (window.matchMedia(smallScreenMediaQuery).matches) {
    document
      .querySelector(`#${sidebarId}`)
      .classList.remove(sidebarActiveClassName);
  }
};
