import { Bar } from "react-chartjs-2";
import { calculateCodeMetrics } from "../utils/metrics";

export default function InsightsPanel({ code }: { code: string }) {
  const metrics = calculateCodeMetrics(code);
  const data = {
    labels: ["Lines", "Functions", "Classes"],
    datasets: [{ label: "Code Metrics", data: [metrics.lines, metrics.functions, metrics.classes], backgroundColor: ["#f00","#0f0","#00f"] }]
  };
  return <div style={{ padding: "10px", borderTop: "1px solid gray" }}>
    <h4>Code Metrics</h4>
    <Bar data={data} />
  </div>;
}