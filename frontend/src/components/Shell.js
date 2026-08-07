import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  AirplaneTilt,
  Brain,
  Bell,
  ChartLineUp,
  ClipboardText,
  Files,
  House,
  Receipt,
  UserCircle,
} from "@phosphor-icons/react";

const navigation = [
  { label: "Ringkasan", to: "/", icon: House, roles: ["PIC Accounting", "Koordinator", "SPV", "Manager", "Sekretaris Divisi"] },
  { label: "Rencana STO", to: "/rencana", icon: AirplaneTilt, roles: ["PIC Accounting", "Koordinator"] },
  { label: "AI Travel Assistant", to: "/ai-travel", icon: Brain, roles: ["PIC Accounting"] },
  { label: "Monitoring RAB", to: "/persetujuan", icon: ClipboardText, roles: ["Koordinator", "SPV", "Manager"] },
  { label: "Realisasi", to: "/realisasi", icon: Receipt, roles: ["PIC Accounting"] },
  { label: "Inbox Pemesanan", to: "/inbox", icon: Files, roles: ["PIC Accounting", "Sekretaris Divisi"] },
  { label: "Monitoring Anggaran", to: "/monitoring", icon: ChartLineUp, roles: ["Koordinator", "SPV", "Manager"] },
];

const roles = ["PIC Accounting", "Koordinator", "SPV", "Manager", "Sekretaris Divisi"];

export default function Shell() {
  const [role, setRole] = useState("PIC Accounting");
  const profileId = role === "PIC Accounting" ? "pic-nadia" : role === "Koordinator" ? "coord-jabar" : "";

  return (
    <div className="app-shell" data-testid="sto-application-shell">
      <aside className="sidebar" data-testid="primary-navigation">
        <Link to="/" className="brand" data-testid="brand-home-link">
          <span className="brand-mark">STO</span>
          <span>Travel Desk</span>
        </Link>
        <p className="sidebar-caption" data-testid="sidebar-period-label">SIKLUS STO 2026</p>
        <nav className="nav-links" aria-label="Navigasi utama">
          {navigation.filter((item) => item.roles.includes(role)).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
                data-testid={`nav-${item.label.toLowerCase().replaceAll(" ", "-")}`}
              >
                <Icon size={19} weight="bold" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-footer" data-testid="sidebar-help-text">
          Bukti dan keputusan tersimpan dalam jejak proses STO.
        </div>
      </aside>

      <main className="main-workspace">
        <header className="topbar" data-testid="workspace-header">
          <div>
            <p className="eyebrow" data-testid="workspace-breadcrumb">OPERASIONAL / STO</p>
            <p className="topbar-title" data-testid="workspace-title">Kendali perjalanan, anggaran, dan bukti</p>
          </div>
          <div className="topbar-actions">
            <label className="role-selector-label" htmlFor="role-selector">Mode peran</label>
            <select
              id="role-selector"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              data-testid="role-selector"
            >
              {roles.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <button className="icon-button" type="button" aria-label="Notifikasi" data-testid="notifications-button">
              <Bell size={20} weight="bold" />
              <span className="notification-dot" />
            </button>
            <div className="profile-chip" data-testid="current-role-indicator">
              <UserCircle size={28} weight="fill" />
              <span>{role}</span>
            </div>
          </div>
        </header>
        <Outlet context={{ role, profileId }} />
      </main>
    </div>
  );
}