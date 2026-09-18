import {
  AnimationRoutes,
  App,
  Box,
  Route,
  ZMPRouter,
} from "zmp-ui";
import { Navigate, useLocation } from "react-router-dom";
import HomePage from "@/pages/index";
import NotificationPage from "@/pages/notification";
import ProfilePage from "@/pages/profile";
import AppHeader from "@/components/app-header";
import Navigation from "@/components/bottom_navigation";
import appBackground from "@/static/app-background.svg";
import SearchPage from "@/pages/search";
import StoryPage from "@/pages/story";
import ProductDetailPage from "@/pages/product-detail";
import CategoryProductsPage from "@/pages/category-products";
import CartPage from "@/pages/cart";
import SuggestionsPage from "@/pages/suggestions";
import OrdersPage from "@/pages/orders";
import OrderDetailPage from "@/pages/order-detail";
import ScanPayPage from "@/pages/scan-pay";
import AddressPage from "@/pages/address";
import HelpPage from "@/pages/help";
import FavoritesPage from "@/pages/favorites";

const SUB_PAGE_PREFIXES = [
  "/product/",
  "/category/",
  "/cart",
  "/suggestions",
  "/story",
  "/orders",
  "/order/",
  "/scan-pay",
  "/address",
  "/help",
  "/favorites",
];

const AppHeaderGate = () => {
  const location = useLocation();
  const hideHeader = SUB_PAGE_PREFIXES.some((prefix) =>
    location.pathname.startsWith(prefix),
  );

  if (hideHeader) return null;

  return <AppHeader />;
};

const NavigationGate = () => {
  const location = useLocation();
  const hideNavigation =
    location.pathname.startsWith("/category/") ||
    location.pathname.startsWith("/cart") ||
    location.pathname.startsWith("/suggestions") ||
    location.pathname.startsWith("/orders") ||
    location.pathname.startsWith("/order/") ||
    location.pathname.startsWith("/scan-pay") ||
    location.pathname.startsWith("/address") ||
    location.pathname.startsWith("/help") ||
    location.pathname.startsWith("/favorites");

  if (hideNavigation) return null;

  return <Navigation />;
};

const Layout = () => {
  return (
    <App>
      <ZMPRouter>
        <Box
          flex
          flexDirection="column"
          className="h-screen bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${appBackground})` }}
        >
          <AppHeaderGate />

          <Box className="home-routes flex min-h-0 flex-1 flex-col overflow-hidden">
            <AnimationRoutes>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/notification" element={<NotificationPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/story" element={<StoryPage />} />
              <Route path="/product/:id" element={<ProductDetailPage />} />
              <Route path="/category/:name" element={<CategoryProductsPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/suggestions" element={<SuggestionsPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/order/:id" element={<OrderDetailPage />} />
              <Route path="/scan-pay" element={<ScanPayPage />} />
              <Route path="/address" element={<AddressPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
            </AnimationRoutes>
          </Box>
          <NavigationGate />
        </Box>
      </ZMPRouter>
    </App>
  );
};
export default Layout;
