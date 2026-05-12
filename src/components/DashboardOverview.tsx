"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Settings2, Users } from "lucide-react";
import Link from "next/link";

type MetricTone = "default" | "accent" | "success" | "danger";

type DashboardMetric = {
  id: string;
  title: string;
  value: number;
  href: string;
  tone: MetricTone;
  helper: string;
  icon: "users" | "clock" | "alert" | "check";
};

type DashboardPreferences = {
  mainIds: string[];
  visibleIds: string[];
};

const STORAGE_KEY = "folga-dashboard-preferences-v1";

function metricIcon(icon: DashboardMetric["icon"]) {
  if (icon === "clock") return <Clock3 size={18} />;
  if (icon === "alert") return <AlertTriangle size={18} />;
  if (icon === "check") return <CheckCircle2 size={18} />;
  return <Users size={18} />;
}

function resolvePreferences(metrics: DashboardMetric[], saved?: DashboardPreferences | null) {
  const allIds = metrics.map((metric) => metric.id);
  const defaultMainIds = allIds.slice(0, 4);
  const defaultVisibleIds = allIds;

  if (!saved) {
    return {
      mainIds: defaultMainIds,
      visibleIds: defaultVisibleIds,
    };
  }

  const visibleIds = saved.visibleIds.filter((id) => allIds.includes(id));
  const baseVisibleIds = visibleIds.length >= 4 ? visibleIds : defaultVisibleIds;

  const mainIds: string[] = [];
  for (const id of saved.mainIds) {
    if (baseVisibleIds.includes(id) && !mainIds.includes(id)) {
      mainIds.push(id);
    }
  }

  for (const id of baseVisibleIds) {
    if (mainIds.length >= 4) break;
    if (!mainIds.includes(id)) {
      mainIds.push(id);
    }
  }

  return {
    mainIds,
    visibleIds: baseVisibleIds,
  };
}

export default function DashboardOverview({ metrics }: { metrics: DashboardMetric[] }) {
  const [preferences, setPreferences] = useState<DashboardPreferences>(() => {
    if (typeof window === "undefined") {
      return resolvePreferences(metrics);
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as DashboardPreferences) : null;
      return resolvePreferences(metrics, parsed);
    } catch {
      return resolvePreferences(metrics);
    }
  });

  const resolvedPreferences = resolvePreferences(metrics, preferences);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resolvedPreferences));
  }, [resolvedPreferences]);

  const visibleMetrics = metrics.filter((metric) => resolvedPreferences.visibleIds.includes(metric.id));
  const mainMetrics = resolvedPreferences.mainIds
    .map((id) => metrics.find((metric) => metric.id === id))
    .filter((metric): metric is DashboardMetric => Boolean(metric));
  const secondaryMetrics = visibleMetrics.filter((metric) => !resolvedPreferences.mainIds.includes(metric.id));

  function updateMainSlot(index: number, metricId: string) {
    const nextMainIds = [...resolvedPreferences.mainIds];
    const currentId = nextMainIds[index];
    const conflictingIndex = nextMainIds.findIndex((id, slot) => id === metricId && slot !== index);

    if (conflictingIndex >= 0) {
      nextMainIds[conflictingIndex] = currentId;
    }

    nextMainIds[index] = metricId;
    setPreferences((current) => ({
      ...current,
      mainIds: resolvePreferences(metrics, { ...resolvedPreferences, mainIds: nextMainIds }).mainIds,
      visibleIds: resolvedPreferences.visibleIds.includes(metricId)
        ? resolvedPreferences.visibleIds
        : [...resolvedPreferences.visibleIds, metricId],
    }));
  }

  function toggleVisible(metricId: string) {
    const isVisible = resolvedPreferences.visibleIds.includes(metricId);

    if (isVisible && resolvedPreferences.visibleIds.length <= 4) {
      return;
    }

    const visibleIds = isVisible
      ? resolvedPreferences.visibleIds.filter((id) => id !== metricId)
      : [...resolvedPreferences.visibleIds, metricId];

    setPreferences(resolvePreferences(metrics, { ...resolvedPreferences, visibleIds }));
  }

  return (
    <div className="dashboard-overview-shell">
      <div className="card dashboard-preferences-panel">
        <div className="dashboard-preferences-header">
          <div>
            <h2 style={{ marginBottom: "0.2rem" }}>Vista del tablero</h2>
            <p style={{ margin: 0 }}>
              Elige cuales indicadores ocupan la franja principal y cuales siguen visibles debajo.
            </p>
          </div>
          <div className="dashboard-preferences-icon">
            <Settings2 size={18} />
          </div>
        </div>

        <div className="dashboard-preferences-grid">
          {[0, 1, 2, 3].map((index) => (
            <label key={index} className="dashboard-preferences-field">
              <span>Tarjeta principal {index + 1}</span>
              <select
                className="select"
                value={resolvedPreferences.mainIds[index] ?? metrics[index]?.id}
                onChange={(event) => updateMainSlot(index, event.target.value)}
              >
                {metrics.map((metric) => (
                  <option key={metric.id} value={metric.id}>
                    {metric.title}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div className="dashboard-toggle-list">
          {metrics.map((metric) => {
            const checked = resolvedPreferences.visibleIds.includes(metric.id);
            return (
              <label key={metric.id} className="dashboard-toggle-item">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleVisible(metric.id)}
                  disabled={checked && resolvedPreferences.visibleIds.length <= 4}
                />
                <span>{metric.title}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="dashboard-main-grid">
        {mainMetrics.map((metric) => (
          <DashboardMetricCard key={metric.id} metric={metric} prominence="main" />
        ))}
      </div>

      {secondaryMetrics.length > 0 ? (
        <div className="dashboard-secondary-grid">
          {secondaryMetrics.map((metric) => (
            <DashboardMetricCard key={metric.id} metric={metric} prominence="secondary" />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DashboardMetricCard({
  metric,
  prominence,
}: {
  metric: DashboardMetric;
  prominence: "main" | "secondary";
}) {
  return (
    <Link href={metric.href} className={`dashboard-metric-card dashboard-metric-card-${prominence} tone-${metric.tone}`}>
      <div className="dashboard-metric-card-head">
        <div className="dashboard-metric-title">{metric.title}</div>
        <div className="dashboard-metric-icon">{metricIcon(metric.icon)}</div>
      </div>
      <div className="dashboard-metric-value">{metric.value}</div>
      <div className="dashboard-metric-helper">{metric.helper}</div>
    </Link>
  );
}
