import { Icon, useLocation, useNavigate } from "zmp-ui";

type TabItem = {
  label: string;
  path: string;
  icon: string;
  variant: "circle" | "pill";
};

const tabs: TabItem[] = [
  {
    label: "Notification",
    path: "/notification",
    icon: "zi-notif-ring",
    variant: "circle",
  },
  {
    label: "Home",
    path: "/home",
    icon: "zi-home",
    variant: "pill",
  },
  {
    label: "Search",
    path: "/search",
    icon: "zi-search",
    variant: "circle",
  },
  {
    label: "Profile",
    path: "/profile",
    icon: "zi-user",
    variant: "circle",
  },
];

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeIndex = tabs.findIndex((tab) => tab.path === location.pathname);
  const defaultActiveIndex = tabs.findIndex((tab) => tab.path === "/home");
  const resolvedActiveIndex =
    activeIndex >= 0 ? activeIndex : defaultActiveIndex;

  return (
    <nav className="app-bottom-navigation" aria-label="Bottom navigation">
      {tabs.map((tab, index) => {
        const isActive = index === resolvedActiveIndex;
        const isMap = tab.label === "Home";

        return (
          <button
            key={tab.path}
            type="button"
            aria-label={tab.label}
            aria-current={isActive ? "page" : undefined}
            className={`app-bottom-navigation__item app-bottom-navigation__item--${tab.variant}`}
            onClick={() =>
              navigate(tab.path, {
                direction: index < resolvedActiveIndex ? "backward" : "forward",
              })
            }
          >
            <Icon icon={tab.icon as any} size={24} />
            {isMap && <span>Trang chủ</span>}
          </button>
        );
      })}
    </nav>
  );
}

export default Navigation;
