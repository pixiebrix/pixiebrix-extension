export const SIDEBAR_ID = "sidebar";
const smallScreenMediaQuery = "(max-width: 991px)";
const sidebarActiveClassName = "active"; // Used to show/hide navbar on small screen
const sidebarIconOnlyClassName = "sidebar-icon-only"; // Used to show/hide navbar on big screen

function getSidebar(): Element {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- We know it exists
  return document.querySelector(`#${SIDEBAR_ID}`)!;
}

export const toggleSidebar = () => {
  if (window.matchMedia(smallScreenMediaQuery).matches) {
    getSidebar().classList.toggle(sidebarActiveClassName);
  } else {
    document.body.classList.toggle(sidebarIconOnlyClassName);
  }
};

export const closeSidebarOnSmallScreen = () => {
  if (window.matchMedia(smallScreenMediaQuery).matches) {
    getSidebar().classList.remove(sidebarActiveClassName);
  }
};
