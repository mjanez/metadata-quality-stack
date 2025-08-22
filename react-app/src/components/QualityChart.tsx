import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface QualityChartProps {
  data: {
    [key: string]: {
      score: number;
      maxScore: number;
      percentage: number;
    };
  };
}

const QualityChart: React.FC<QualityChartProps> = ({ data }) => {
  const { t } = useTranslation();
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-bs-theme') || 'light');
  
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-bs-theme') || 'light');
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-bs-theme']
    });
    
    return () => observer.disconnect();
  }, []);
  
  // Filter out categories with no max score
  const validCategories = Object.entries(data).filter(([_, scores]) => scores.maxScore > 0);
  
  if (validCategories.length === 0) {
    return (
      <div className="text-center text-muted py-4">
        <p>No quality data available for chart</p>
      </div>
    );
  }

  const isDark = theme === 'dark';
  const textColor = isDark ? '#ffffff' : '#000000';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  const chartData = {
    labels: validCategories.map(([category]) => 
      t(`dimensions.${category}`)
    ),
    datasets: [
      {
        label: t('results.chart_title'),
        data: validCategories.map(([_, scores]) => scores.percentage),
        backgroundColor: 'rgba(13, 110, 253, 0.2)',
        borderColor: 'rgba(13, 110, 253, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(13, 110, 253, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(13, 110, 253, 1)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: textColor,
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const categoryIndex = context.dataIndex;
            const [category, scores] = validCategories[categoryIndex];
            return `${t(`dimensions.${category}`)}: ${scores.score}/${scores.maxScore} (${scores.percentage.toFixed(1)}%)`;
          }
        }
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          color: textColor,
          callback: function(value: any) {
            return value + '%';
          }
        },
        grid: {
          color: gridColor,
        },
        angleLines: {
          color: gridColor,
        },
        pointLabels: {
          color: textColor,
        }
      },
    },
  };

  return (
    <div style={{ height: '400px', position: 'relative' }}>
      <Radar data={chartData} options={options} />
    </div>
  );
};

export default QualityChart;
