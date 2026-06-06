import {
  Content,
  Header,
  HeaderName,
  SideNav,
  SideNavItems,
  SideNavLink,
} from "@carbon/react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Dashboard } from "./routes/Dashboard.js";
import { Projects } from "./routes/Projects.js";

const NAV = [
  { label: "Dashboard", to: "/" },
  { label: "Projects", to: "/projects" },
];

export function App() {
  const { pathname } = useLocation();
  return (
    <>
      <Header aria-label="ESTI AORMS">
        <HeaderName prefix="ESTI">AORMS</HeaderName>
      </Header>
      <SideNav aria-label="Side navigation" isRail expanded>
        <SideNavItems>
          {NAV.map((n) => (
            <SideNavLink key={n.to} as={Link} to={n.to} isActive={pathname === n.to}>
              {n.label}
            </SideNavLink>
          ))}
        </SideNavItems>
      </SideNav>
      <Content>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Content>
    </>
  );
}
