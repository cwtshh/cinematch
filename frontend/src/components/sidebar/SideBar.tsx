import { authClient } from "@/lib/auth-client";
import {
  Clapperboard,
  Film,
  LogOut,
  Search,
  SlidersHorizontal,
  Sparkles,
  User,
} from "lucide-react";
import { NavLink } from "react-router";

const tabs = [
  { to: "/for-you", Icon: Film, label: "Para você", end: true },
  { to: "/search", Icon: Search, label: "Buscar" },
  { to: "/preferences", Icon: SlidersHorizontal, label: "Preferências" },
  { to: "/profile", Icon: User, label: "Perfil" },
];

export function Sidebar() {
  const { data: session } = authClient.useSession();

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="px-5 pt-7 pb-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent">
            <Clapperboard
              size={16}
              className="text-sidebar-primary"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </div>

          <span className="text-lg font-black tracking-tight">CineMatch</span>
        </div>
      </div>

      <div className="mx-5 mb-5 flex items-center gap-2 rounded-xl border border-sidebar-border bg-sidebar-accent px-3 py-2">
        <Sparkles
          size={12}
          className="text-sidebar-primary"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <span className="font-inter text-xs font-medium text-sidebar-primary">
          Recomendações por IA
        </span>
      </div>

      <nav
        className="flex flex-1 flex-col gap-1 px-3"
        aria-label="Navegação principal"
      >
        {tabs.map(({ to, Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                "font-inter flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={17}
                  strokeWidth={isActive ? 2.5 : 1.75}
                  aria-hidden="true"
                />
                <span>{label}</span>

                {isActive && (
                  <div
                    className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary-foreground"
                    aria-hidden="true"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-4 pt-4 pb-6">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent">
            <span className="text-xs font-black text-sidebar-primary">
              {session?.user.name.charAt(0)}
            </span>
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              {session?.user.name}
            </p>
            <p className="font-inter text-[11px] text-muted-foreground">
              {session?.user.email}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="font-inter flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={() => authClient.signOut()}
        >
          <LogOut size={13} strokeWidth={1.75} aria-hidden="true" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
