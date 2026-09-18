import { useEffect } from "react";
import { useAtom } from "jotai";
import { Icon, useLocation, useNavigate } from "zmp-ui";
import { unreadNotificationCountAtom } from "@/store/notifications";
import { fetchNotifications } from "@/services/notifications";
import {
  getStoredZaloUser,
  ZALO_AUTH_CHANGED_EVENT,
} from "@/services/zalo-auth";

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
  const [unreadCount, setUnreadCount] = useAtom(unreadNotificationCountAtom);
  const activeIndex = tabs.findIndex((tab) => tab.path === location.pathname);
  const defaultActiveIndex = tabs.findIndex((tab) => tab.path === "/home");
  const resolvedActiveIndex =
    activeIndex >= 0 ? activeIndex : defaultActiveIndex;

  useEffect(() => {
    let cancelled = false;

    const loadUnreadCount = () => {
      fetchNotifications(getStoredZaloUser()?.id)
        .then((data) => {
          if (!cancelled) {
            setUnreadCount(data.filter((item) => item.unread).length);
          }
        })
        .catch(() => {});
    };

    loadUnreadCount();
    window.addEventListener(ZALO_AUTH_CHANGED_EVENT, loadUnreadCount);

    return () => {
      cancelled = true;
      window.removeEventListener(ZALO_AUTH_CHANGED_EVENT, loadUnreadCount);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <nav className="app-bottom-navigation" aria-label="Bottom navigation">
      {tabs.map((tab, index) => {
        const isActive = index === resolvedActiveIndex;
        const isMap = tab.label === "Home";
        const showBadge = tab.label === "Notification" && unreadCount > 0;

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
            <span className="relative inline-flex">
              <Icon icon={tab.icon as any} size={24} />
              {showBadge && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
              )}
            </span>
            {isMap && <span>Trang chủ</span>}
          </button>
        );
      })}
    </nav>
  );
}

export default Navigation;
