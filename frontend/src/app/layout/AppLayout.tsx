import { Outlet } from "react-router";
import { Sidebar } from "../../components/sidebar/SideBar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="md:pl-64">
        <Outlet />
      </div>
    </div>
  );
}