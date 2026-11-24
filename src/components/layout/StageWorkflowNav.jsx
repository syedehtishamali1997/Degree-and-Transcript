import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useCaseTrack } from "../../context/CaseTrackContext";

export function StageWorkflowNav() {
  const location = useLocation();
  const { stats } = useCaseTrack();

  const stages = [
    {
      path: "/students/all",
      label: "All Students",
      icon: "bi-people",
      badgeCount: stats?.counts?.total ?? 0,
      badgeClass: "bg-secondary"
    },
    {
      path: "/students/pending",
      label: "Pending Cases",
      icon: "bi-hourglass-split",
      badgeCount: stats?.counts?.pending ?? 0,
      badgeClass: "bg-secondary"
    },
    {
      path: "/students/case-ready",
      label: "Case Ready",
      icon: "bi-check2-circle",
      badgeCount: stats?.counts?.ready ?? 0,
      badgeClass: "bg-primary"
    },
    {
      path: "/students/sent",
      label: "Sent to Main Campus",
      icon: "bi-send",
      badgeCount: stats?.counts?.sent ?? 0,
      badgeClass: "bg-warning text-dark"
    },
    {
      path: "/students/returned",
      label: "Returned Cases",
      icon: "bi-arrow-return-left",
      badgeCount: stats?.counts?.returned ?? 0,
      badgeClass: "bg-danger"
    },
    {
      path: "/students/received",
      label: "Received Cases",
      icon: "bi-patch-check-fill",
      badgeCount: stats?.counts?.received ?? 0,
      badgeClass: "bg-success"
    }
  ];

  return (
    <div className="stage-workflow-tabs mb-3">
      <ul className="nav nav-pills stage-nav flex-nowrap overflow-x-auto pb-1" role="tablist">
        {stages.map((st) => {
          const isActive = location.pathname === st.path;
          return (
            <li key={st.path} className="nav-item" role="presentation">
              <Link
                to={st.path}
                className={`nav-link stage-nav-link ${isActive ? "active" : ""}`}
                role="tab"
                aria-selected={isActive}
              >
                <i className={`bi ${st.icon} me-1`}></i>
                {st.label}
                <span className={`badge rounded-pill ${st.badgeClass} ms-1`}>
                  {st.badgeCount}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
