"use client";

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { type AppLanguage, t } from "@/lib/i18n";

type ChartData = {
  byStatus: { name: string; value: number }[];
  byCountry: { name: string; value: number }[];
  byTimeline: { date: string; count: number }[];
};

export default function DashboardCharts({ data, language }: { data: ChartData; language: AppLanguage }) {
  const labels = t.bind(null, language);
  const COLORS = ["#e4ff4d", "#00513f", "#cfd3bd", "#080908", "#8d9287"];

  return (
    <section className="dashboard-analytics" aria-labelledby="dashboard-analytics-title">
      <div className="dashboard-analytics-head">
        <div>
          <span className="dashboard-section-kicker">{labels("dashboard.chartEyebrow")}</span>
          <h2 id="dashboard-analytics-title">{labels("dashboard.chartTitle")}</h2>
        </div>
        <span className="dashboard-analytics-caption">{labels("dashboard.chartCaption")}</span>
      </div>
      <div className="dashboard-chart-grid">
      {/* Distribución por Estado */}
      <div className="card dashboard-chart-card dashboard-chart-status">
        <div className="dashboard-chart-card-head"><span>{labels("dashboard.chartPipeline")}</span><h3>{labels("dashboard.chartCandidatesByStatus")}</h3></div>
        <ResponsiveContainer width="100%" height={244}>
          <PieChart>
            <Pie
              data={data.byStatus}
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={88}
              paddingAngle={5}
              dataKey="value"
              label
            >
              {data.byStatus.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#000" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: "var(--ghost-white)", border: "2px solid black" }} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Candidatos por País */}
      <div className="card dashboard-chart-card dashboard-chart-country">
        <div className="dashboard-chart-card-head"><span>{labels("dashboard.chartMarkets")}</span><h3>{labels("dashboard.chartCandidatesByCountry")}</h3></div>
        <ResponsiveContainer width="100%" height={244}>
          <BarChart data={data.byCountry}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip contentStyle={{ backgroundColor: "var(--ghost-white)", border: "2px solid black" }} />
            <Bar dataKey="value" fill="#e4ff4d" stroke="#080908" strokeWidth={1} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Crecimiento Temporal */}
      <div className="card dashboard-chart-card dashboard-chart-timeline">
        <div className="dashboard-chart-card-head"><span>{labels("dashboard.chartActivity")}</span><h3>{labels("dashboard.chartNewRegistrations")}</h3></div>
        <ResponsiveContainer width="100%" height={252}>
          <LineChart data={data.byTimeline}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip contentStyle={{ backgroundColor: "var(--ghost-white)", border: "2px solid black" }} />
            <Line type="monotone" dataKey="count" stroke="#00513f" strokeWidth={3} dot={{ r: 4, fill: "#e4ff4d", stroke: "#080908", strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      </div>
    </section>
  );
}
