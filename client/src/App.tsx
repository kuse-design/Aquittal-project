import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import AdminGate from "@/components/AdminGate";
import NotFound from "@/pages/NotFound";
import AdminOrders from "@/pages/AdminOrders";
import AdminProducts from "@/pages/AdminProducts";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Shop from "@/pages/Shop";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function AdminProductsRoute() {
  return <AdminGate><AdminProducts /></AdminGate>;
}

function AdminOrdersRoute() {
  return <AdminGate><AdminOrders /></AdminGate>;
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/shop" component={Shop} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
      <Route path={"/admin"} component={AdminProductsRoute} />
      <Route path={"/admin/orders"} component={AdminOrdersRoute} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <CartProvider>
        <ThemeProvider
          defaultTheme="light"
        >
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </CartProvider>
    </ErrorBoundary>
  );
}

export default App;