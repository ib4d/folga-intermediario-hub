"use client";

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";

type ChartData = {
  byStatus: { name: string; value: number }[];
  byCountry: { name: string; value: number }[];
  byTimeline: { date: string; count: number }[];
};

export default function DashboardCharts({ data }: { data: ChartData }) {
  const COLORS = ["#fcba04", "#000000", "#7d8a6a", "#fbf9ff", "#4ade80"];

  return (
    <div className="dashboard-grid" style={{ marginTop: "2rem", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))" }}>
      {/* Distribución por Estado */}
      <div className="card" style={{ height: "400px" }}>
        <h3>Candidatos por Estado</h3>
        <ResponsiveContainer width="100%" height="90%">
          <PieChart>
            <Pie
              data={data.byStatus}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
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
      <div className="card" style={{ height: "400px" }}>
        <h3>Candidatos por País</h3>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={data.byCountry}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip contentStyle={{ backgroundColor: "var(--ghost-white)", border: "2px solid black" }} />
            <Bar dataKey="value" fill="var(--amber-flame)" stroke="#000" strokeWidth={2} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Crecimiento Temporal */}
      <div className="card" style={{ height: "400px", gridColumn: "1 / -1" }}>
        <h3>Nuevos Registros (Últimas semanas)</h3>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={data.byTimeline}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip contentStyle={{ backgroundColor: "var(--ghost-white)", border: "2px solid black" }} />
            <Line type="monotone" dataKey="count" stroke="var(--amber-flame)" strokeWidth={4} dot={{ r: 6, fill: "#000" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
