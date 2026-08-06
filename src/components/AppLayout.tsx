import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/journeys", label: "Journeys" },
  { to: "/gallery", label: "Gallery" },
  { to: "/hiking", label: "Hiking" },
  { to: "/camping", label: "Camping" },
  { to: "/about", label: "About" },
  { to: "/admin", label: "Admin" },
];

export function AppLayout() {
  return (
    <>
      <header className="site-header">
        <NavLink className="site-header__brand" to="/">
          My Adventure Map
        </NavLink>
        <nav className="site-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink className="site-nav__link" key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <Outlet />
    </>
  );
}
