import { useStore } from '@nanostores/react';
import { validationStore } from '../lib/stores';

export default function MetricTable() {
  const { report } = useStore(validationStore);
  
  if (!report || !report.mqaResults || !report.mqaResults.metrics) {
    return <div className="metrics-placeholder">No metrics data available</div>;
  }
  
  const metrics = report.mqaResults.metrics;
  
  return (
    <div className="metrics-table">
      <h2>Detailed Metrics</h2>
      <table className="w-full">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Dimension</th>
            <th>Score</th>
            <th>Count</th>
            <th>Total</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map(metric => (
            <tr key={metric.id}>
              <td>{metric.name}</td>
              <td>{metric.dimension}</td>
              <td>{metric.points}/{metric.weight}</td>
              <td>{metric.count}</td>
              <td>{metric.population}</td>
              <td>{(metric.percentage * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}