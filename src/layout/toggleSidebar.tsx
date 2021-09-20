export const SIDEBAR_ID = "sidebar";
const smallScreenMediaQuery = "(max-width: 991px)";
const sidebarActiveClassName = "active"; // Used to show/hide navbar on small screen
const sidebarIconOnlyClassName = "sidebar-icon-only"; // Used to show/hide navbar on big screen

export const toggleSidebar = () => {
  if (window.matchMedia(smallScreenMediaQuery).matches) {
    document
      .querySelector(`#${SIDEBAR_ID}`)
      .classList.toggle(sidebarActiveClassName);
  } else {
    document.body.classList.toggle(sidebarIconOnlyClassName);
  }
};

export const closeSidebarOnSmallScreen = () => {
  if (window.matchMedia(smallScreenMediaQuery).matches) {
    document
      .querySelector(`#${SIDEBAR_ID}`)
      .classList.remove(sidebarActiveClassName);
  }
};
