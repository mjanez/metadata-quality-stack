/**
 * Chart Visualizations Module
 * Handles creation of radar charts and hierarchical visualizations using Chart.js
 */

class ChartRenderer {
    constructor() {
        this.charts = new Map();
        this.defaultColors = {
            findability: '#FF6384',
            accessibility: '#36A2EB', 
            interoperability: '#FFCE56',
            reusability: '#4BC0C0',
            contextuality: '#9966FF'
        };
    }

    /**
     * Create radar chart for quality dimensions
     */
    createRadarChart(canvas, report, profile) {
        console.log('ChartRenderer.createRadarChart called with:', { canvas, report, profile });
        
        // Helper function to ensure translation works
        function _(key) {
            return window._ ? window._(key) : key;
        }
        
        if (!canvas || !report) {
            console.log('Missing canvas or report:', { canvas: !!canvas, report: !!report });
            return;
        }

        // Destroy existing chart if it exists
        const existingChart = this.charts.get(canvas.id);
        if (existingChart) {
            console.log('Destroying existing chart for:', canvas.id);
            existingChart.destroy();
        }

        const ctx = canvas.getContext('2d');
        const dimensions = report.dimensions || {};
        const maxScores = this.getDimensionMaxScores(profile);

        console.log('Dimensions received:', dimensions);
        console.log('Max scores:', maxScores);

        // Prepare data for radar chart - ensure we have the right structure
        let labels, data, maxData;
        
        if (Array.isArray(dimensions)) {
            // If dimensions is an array of objects
            labels = dimensions.map(dim => _(dim.name ? dim.name.toLowerCase() : dim));
            data = dimensions.map(dim => dim.score || 0);
            maxData = dimensions.map(dim => dim.maxScore || 100);
        } else {
            // If dimensions is an object
            const dimKeys = Object.keys(dimensions);
                        labels = dimKeys.map(dim => _(dim.toLowerCase()));
                        data = dimKeys.map(dim => dimensions[dim].score || dimensions[dim] || 0);
                        maxData = dimKeys.map(dim => maxScores[dim.toLowerCase()] || 100);
                    }        console.log('Chart labels:', labels);
        console.log('Chart data:', data);
        console.log('Chart max data:', maxData);

        const chart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: window._('current_score'),
                        data: data,
                        borderColor: '#36A2EB',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderWidth: 3,
                        pointBackgroundColor: '#36A2EB',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 3,
                        pointRadius: 7,
                        pointHoverRadius: 9
                    },
                    {
                        label: window._('maximum_score'),
                        data: maxData,
                        borderColor: '#E0E0E0',
                        backgroundColor: 'rgba(224, 224, 224, 0.1)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointBackgroundColor: '#E0E0E0',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10,
                        left: 10,
                        right: 10
                    }
                },
                plugins: {
                    title: {
                        display: false  // Eliminar título como solicita el usuario
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 25,
                            usePointStyle: true,
                            font: {
                                size: 14
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.r || 0;
                                const maxValue = context.datasetIndex === 1 ? 
                                    value : maxData[context.dataIndex];
                                const percentage = maxValue > 0 ? 
                                    ((value / maxValue) * 100).toFixed(1) : 0;
                                return `${label}: ${value}/${maxValue} (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: Math.max(...maxData),
                        ticks: {
                            stepSize: 20,
                            font: {
                                size: 14
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        angleLines: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        pointLabels: {
                            font: {
                                size: 16,
                                weight: 'bold'
                            },
                            padding: 10
                        }
                    }
                }
            }
        });

        this.charts.set(canvas.id, chart);
        return chart;
    }

    /**
     * Create sunburst/hierarchical chart showing metrics by dimension
     */
    createHierarchicalChart(canvas, report, profile) {
        if (!canvas || !report) return;

        // Destroy existing chart if it exists
        const existingChart = this.charts.get(canvas.id);
        if (existingChart) {
            existingChart.destroy();
        }

        // Clear the canvas
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Try to create a sunburst chart with D3.js if available
        if (typeof d3 !== 'undefined') {
            return this.createSunburstChart(canvas, report, profile);
        } else {
            // Fallback to a donut chart using Chart.js
            return this.createDonutChart(canvas, report, profile);
        }
    }

    /**
     * Create sunburst chart using D3.js (dimensions inner ring, metrics outer ring)
     */
    createSunburstChart(canvas, report, profile) {
        const __ = (key) => (window._ ? window._(key) : key);
        const container = canvas.parentElement;

        // Remove any previous chart
        const prev = container.querySelector('svg.sunburst-chart');
        if (prev) prev.remove();

        // Compute size from container
        const rect = container.getBoundingClientRect();
        const width = Math.max(320, Math.floor(rect.width || canvas.clientWidth || 500));
        const height = Math.max(320, Math.floor(rect.height || canvas.clientHeight || 500));
        const radius = Math.floor(Math.min(width, height) / 2) - 8; // padding

        // Hide canvas and append SVG centered in container
        canvas.style.display = 'none';
        const svg = d3.select(container)
            .append('svg')
            .attr('class', 'sunburst-chart')
            .attr('width', width)
            .attr('height', height)
            .style('display', 'block')
            .style('margin', '0 auto')
            .style('font-family', 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif')
            .style('font-size', '12px');

        const g = svg.append('g')
            .attr('transform', `translate(${width / 2}, ${height / 2})`);

        // Build hierarchical data: root -> dimensions -> metrics
        const sunburstData = this.prepareSunburstDataForSunburst(report);

        // Partition for angles (we'll control radii by depth)
        const partition = d3.partition().size([2 * Math.PI, 1]);
        const root = d3.hierarchy(sunburstData)
            .sum(d => d.value || 0)
            .sort((a, b) => b.value - a.value);
        partition(root);

        const innerR = Math.round(radius * 0.38);
        const ringGap = 2;
        const innerThickness = Math.round(radius * 0.27);
        const outerThickness = radius - (innerR + innerThickness + ringGap);

        const arc = d3.arc()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .padAngle(0.003)
            .padRadius(radius)
            .innerRadius(d => {
                if (d.depth === 1) return innerR;
                if (d.depth === 2) return innerR + innerThickness + ringGap;
                return 0; // center
            })
            .outerRadius(d => {
                if (d.depth === 1) return innerR + innerThickness;
                if (d.depth === 2) return radius;
                return 0;
            });

        // Base colors (match radar colors)
        const baseColors = {
            findability: '#FF6384',
            accessibility: '#36A2EB',
            interoperability: '#FFCE56',
            reusability: '#4BC0C0',
            contextuality: '#9966FF'
        };
        const colorFor = (name, depth) => {
            const key = (name || '').toLowerCase();
            const base = d3.color(baseColors[key] || '#8884d8');
            if (depth === 1) return base.formatHex();
            // lighten for metrics
            const light = d3.interpolateRgb(base, d3.rgb(255, 255, 255))(0.30);
            return d3.color(light).formatHex();
        };

        // Draw arcs (skip root)
        const nodes = root.descendants().filter(d => d.depth > 0);
        g.selectAll('path')
            .data(nodes)
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', d => colorFor(d.data.dimension || d.data.name, d.depth))
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .attr('opacity', 0.95)
            .on('mousemove', function (event, d) {
                const tooltip = d3.select('body').selectAll('.sunburst-tooltip').data([0]);
                const tip = tooltip.enter().append('div').attr('class', 'sunburst-tooltip').merge(tooltip);

                let title = d.data.display || d.data.name;
                let score = d.data.score ?? d.data.value ?? 0;
                let max = d.data.maxScore ?? d.data.weight ?? d.data.total ?? 0;
                let label = `${title}`;
                let details = `${__('current_score')}: ${score}`;
                if (max) details += ` / ${max}`;

                tip.html(`<strong>${label}</strong><br>${details}`)
                    .style('left', `${event.pageX + 12}px`)
                    .style('top', `${event.pageY - 12}px`)
                    .style('opacity', 1);
                d3.select(this).attr('opacity', 1);
            })
            .on('mouseleave', function () {
                d3.select('.sunburst-tooltip')?.style('opacity', 0);
                d3.select(this).attr('opacity', 0.95);
            });

        // Labels for inner ring (dimensions) when arc is wide enough
        const labelThreshold = 0.10; // radians fraction of full circle
        g.selectAll('text.dim-label')
            .data(nodes.filter(d => d.depth === 1 && (d.x1 - d.x0) > (2 * Math.PI * 0.06)))
            .enter()
            .append('text')
            .attr('class', 'dim-label')
            .attr('text-anchor', 'middle')
            .style('font-weight', '600')
            .style('pointer-events', 'none')
            .style('fill', '#333')
            .attr('transform', d => {
                const a = (d.x0 + d.x1) / 2 - Math.PI / 2;
                const r = innerR + innerThickness / 2;
                return `translate(${Math.cos(a) * r}, ${Math.sin(a) * r}) rotate(${(a * 180 / Math.PI)})`;
            })
            .text(d => __( (d.data.name || '').toLowerCase() ));

        // Optional labels for outer metrics (only if wide enough)
        g.selectAll('text.metric-label')
            .data(nodes.filter(d => d.depth === 2 && (d.x1 - d.x0) > (2 * Math.PI * 0.03)))
            .enter()
            .append('text')
            .attr('class', 'metric-label')
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('pointer-events', 'none')
            .style('fill', '#333')
            .attr('transform', d => {
                const a = (d.x0 + d.x1) / 2 - Math.PI / 2;
                const r = innerR + innerThickness + ringGap + (outerThickness * 0.6);
                return `translate(${Math.cos(a) * r}, ${Math.sin(a) * r}) rotate(${(a * 180 / Math.PI)})`;
            })
            .text(d => d.data.display || d.data.name);

        // Center hole and total text
        g.append('circle')
            .attr('r', innerR - 8)
            .attr('fill', '#f2f4f7');

        const total = report.totalScore || 0;
        const max = report.maxScore || 0;
        g.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '-0.2em')
            .style('font-size', '14px')
            .style('fill', '#6b7280')
            .text('Total');
        g.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '1.0em')
            .style('font-size', '18px')
            .style('font-weight', 700)
            .style('fill', '#111827')
            .text(`${total}${max ? `/${max}` : ''}`);

        // Keep destroy handle
        this.charts.set(canvas.id, {
            destroy: () => {
                svg.remove();
                d3.select('.sunburst-tooltip').remove();
                canvas.style.display = 'block';
            }
        });

        return svg.node();
    }

    /**
     * Prepare data for sunburst chart
     */
    prepareSunburstDataForSunburst(report) {
        // Normalize dimensions array
        const dims = Array.isArray(report.dimensions) ? report.dimensions : [];
        const metrics = Array.isArray(report.metrics) ? report.metrics : [];

        const byDim = new Map();
        dims.forEach(d => {
            const key = (d.name || '').toLowerCase();
            byDim.set(key, {
                name: key,
                display: (d.name || key),
                score: d.score || 0,
                maxScore: d.maxScore || 0,
                value: d.score || 0,
                children: []
            });
        });

        // Group metrics by their dimension
        metrics.forEach(m => {
            const key = (m.dimension || '').toLowerCase();
            if (!byDim.has(key)) {
                byDim.set(key, {
                    name: key,
                    display: m.dimension || key,
                    score: 0,
                    maxScore: 0,
                    value: 0,
                    children: []
                });
            }
            byDim.get(key).children.push({
                name: m.id || m.name || 'metric',
                display: m.name || m.id,
                value: m.points || 0,
                score: m.points || 0,
                weight: m.weight || m.maxScore || 0
            });
        });

        return {
            name: 'root',
            children: Array.from(byDim.values())
        };
    }

    /**
     * Fallback donut chart using Chart.js
     */
    createDonutChart(canvas, report, profile) {
        console.log('Creating fallback donut chart');
        
        const ctx = canvas.getContext('2d');
        const dimensions = report.dimensions || [];
        
        let labels, data, colors;
        
        if (Array.isArray(dimensions)) {
            labels = dimensions.map(dim => _(dim.name ? dim.name.toLowerCase() : dim));
            data = dimensions.map(dim => dim.score || 0);
            colors = this.generateColors(dimensions.length);
        } else {
            const dimKeys = Object.keys(dimensions);
            labels = dimKeys.map(dim => _(dim.toLowerCase()));
            data = dimKeys.map(dim => dimensions[dim].score || dimensions[dim] || 0);
            colors = this.generateColors(dimKeys.length);
        }

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: colors.map(color => color.replace('0.8', '1')),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10,
                        left: 10,
                        right: 10
                    }
                },
                plugins: {
                    title: {
                        display: false
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: {
                                size: 14
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? 
                                    ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '50%'
            }
        });

        this.charts.set(canvas.id, chart);
        return chart;
    }

    /**
     * Create score evolution chart for history view
     */
    createScoreEvolutionChart(canvas, historyData) {
        if (!canvas || !historyData || historyData.length === 0) return;

        // Destroy existing chart if it exists
        const existingChart = this.charts.get(canvas.id);
        if (existingChart) {
            existingChart.destroy();
        }

        const ctx = canvas.getContext('2d');
        
        // Prepare data
        const labels = historyData.map(item => item.created);
        const totalScores = historyData.map(item => item.totalScore);
        const dimensions = ['findability', 'accessibility', 'interoperability', 'reusability', 'contextuality'];
        
        // Create datasets for total score and each dimension
        const datasets = [
            {
                label: _('total_score'),
                data: totalScores,
                borderColor: '#2E86AB',
                backgroundColor: 'rgba(46, 134, 171, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true
            }
        ];

        // Add dimension lines
        dimensions.forEach((dimension, index) => {
            const dimensionData = historyData.map(item => item.dimensions[dimension] || 0);
            datasets.push({
                label: _(dimension),
                data: dimensionData,
                borderColor: this.defaultColors[dimension],
                backgroundColor: this.defaultColors[dimension] + '20',
                borderWidth: 2,
                tension: 0.4,
                fill: false
            });
        });

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10,
                        left: 10,
                        right: 10
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: _('score_evolution'),
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                return `${_('date')}: ${context[0].label}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: _('date'),
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: _('score'),
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });

        this.charts.set(canvas.id, chart);
        return chart;
    }

    /**
     * Create metric distribution donut chart
     */
    createMetricDistributionChart(canvas, report, dimension) {
        if (!canvas || !report) return;

        const existingChart = this.charts.get(canvas.id);
        if (existingChart) {
            existingChart.destroy();
        }

        const ctx = canvas.getContext('2d');
        const metrics = report.metrics || [];
        const dimensionMetrics = metrics.filter(m => m.dimension === dimension);

        if (dimensionMetrics.length === 0) {
            // Show empty state
            ctx.fillStyle = '#666';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(_('no_metrics_available'), canvas.width / 2, canvas.height / 2);
            return;
        }

        // Prepare data
        const labels = dimensionMetrics.map(m => _(m.id) || m.id);
        const data = dimensionMetrics.map(m => m.points || 0);
        const colors = this.generateColors(dimensionMetrics.length);

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: colors.map(color => color.replace('0.8', '1')),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10,
                        left: 10,
                        right: 10
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `${_(dimension)} ${_('metrics')}`,
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 10,
                            usePointStyle: true,
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i];
                                        const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                        
                                        return {
                                            text: `${label} (${percentage}%)`,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            hidden: false,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const metric = dimensionMetrics[context.dataIndex];
                                const maxValue = metric.weight || 0;
                                const percentage = maxValue > 0 ? 
                                    ((value / maxValue) * 100).toFixed(1) : 0;
                                return `${label}: ${value}/${maxValue} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '50%'
            }
        });

        this.charts.set(canvas.id, chart);
        return chart;
    }

    /**
     * Group metrics by dimension
     */
    groupMetricsByDimension(metrics) {
        const grouped = {};
        
        metrics.forEach(metric => {
            const dimension = metric.dimension || 'other';
            if (!grouped[dimension]) {
                grouped[dimension] = [];
            }
            grouped[dimension].push(metric);
        });
        
        return grouped;
    }

    /**
     * Create datasets for hierarchical chart
     */
    createHierarchicalDatasets(metricsByDimension, profile) {
        const datasets = [];
        const dimensions = Object.keys(metricsByDimension);
        
        // Get all unique metrics across all dimensions
        const allMetrics = new Set();
        Object.values(metricsByDimension).forEach(dimensionMetrics => {
            dimensionMetrics.forEach(metric => allMetrics.add(metric.id));
        });

        // Create a dataset for each metric
        let colorIndex = 0;
        allMetrics.forEach(metricId => {
            const data = dimensions.map(dimension => {
                const metric = metricsByDimension[dimension]?.find(m => m.id === metricId);
                return metric ? (metric.points || 0) : 0;
            });

            // Only include datasets with non-zero data
            if (data.some(value => value > 0)) {
                const color = this.generateColor(colorIndex);
                const metric = this.findMetricById(metricsByDimension, metricId);
                
                datasets.push({
                    label: _(metricId) || metricId,
                    data: data,
                    backgroundColor: color,
                    borderColor: color.replace('0.8', '1'),
                    borderWidth: 1,
                    metricId: metricId,
                    maxValue: metric?.weight || 0
                });
                
                colorIndex++;
            }
        });

        return datasets;
    }

    /**
     * Find a metric by ID across all dimensions
     */
    findMetricById(metricsByDimension, metricId) {
        for (const dimensionMetrics of Object.values(metricsByDimension)) {
            const metric = dimensionMetrics.find(m => m.id === metricId);
            if (metric) return metric;
        }
        return null;
    }

    /**
     * Generate a color for a given index
     */
    generateColor(index) {
        const colors = [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 205, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(199, 199, 199, 0.8)',
            'rgba(83, 102, 255, 0.8)',
            'rgba(255, 99, 255, 0.8)',
            'rgba(99, 255, 132, 0.8)'
        ];
        
        return colors[index % colors.length];
    }

    /**
     * Generate multiple colors
     */
    generateColors(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(this.generateColor(i));
        }
        return colors;
    }

    /**
     * Get dimension max scores for a profile
     */
    getDimensionMaxScores(profile) {
        const defaultScores = {
            findability: 100,
            accessibility: 100,
            interoperability: 110,
            reusability: 75,
            contextuality: 20
        };

        // Profile-specific max scores
        const profileScores = {
            dcat_ap: defaultScores,
            dcat_ap_es: defaultScores,
            nti_risp: {
                findability: 100,
                accessibility: 50,
                interoperability: 105,
                reusability: 40,
                contextuality: 15
            }
        };

        return profileScores[profile] || defaultScores;
    }

    /**
     * Update chart theme (for dark/light mode)
     */
    updateChartsTheme(isDark) {
        const textColor = isDark ? '#ffffff' : '#333333';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        // Update all existing charts
        this.charts.forEach(chart => {
            if (chart.options.plugins?.title) {
                chart.options.plugins.title.color = textColor;
            }
            if (chart.options.plugins?.legend?.labels) {
                chart.options.plugins.legend.labels.color = textColor;
            }
            if (chart.options.scales) {
                Object.values(chart.options.scales).forEach(scale => {
                    if (scale.title) scale.title.color = textColor;
                    if (scale.ticks) scale.ticks.color = textColor;
                    if (scale.grid) scale.grid.color = gridColor;
                    if (scale.pointLabels) scale.pointLabels.color = textColor;
                });
            }
            chart.update();
        });
    }

    /**
     * Update charts with new data
     */
    updateCharts(report, profile = 'dcat_ap') {
        console.log('ChartRenderer.updateCharts called with:', { report, profile });
        
        // Update radar chart if canvas exists
        const radarCanvas = document.getElementById('radarChart');
        if (radarCanvas) {
            console.log('Updating radar chart...');
            this.createRadarChart(radarCanvas, report, profile);
        }
        
        // Update hierarchical chart if canvas exists
        const hierarchicalCanvas = document.getElementById('hierarchicalChart');
        if (hierarchicalCanvas) {
            console.log('Updating hierarchical chart...');
            this.createHierarchicalChart(hierarchicalCanvas, report, profile);
        }
        
        // Check which chart type is selected and show appropriate container
        const radarBtn = document.getElementById('radarBtn');
        const sunburstBtn = document.getElementById('sunburstBtn');
        
        if (radarBtn && radarBtn.checked) {
            this.showRadarChart();
        } else if (sunburstBtn && sunburstBtn.checked) {
            this.showHierarchicalChart();
        }
    }

    /**
     * Show radar chart and hide hierarchical chart
     */
    showRadarChart() {
        const radarContainer = document.getElementById('radarChartContainer');
        const hierarchicalContainer = document.getElementById('hierarchicalChartContainer');
        
        if (radarContainer) {
            radarContainer.style.display = 'block';
        }
        if (hierarchicalContainer) {
            hierarchicalContainer.style.display = 'none';
        }
    }

    /**
     * Show hierarchical chart and hide radar chart
     */
    showHierarchicalChart() {
        const radarContainer = document.getElementById('radarChartContainer');
        const hierarchicalContainer = document.getElementById('hierarchicalChartContainer');
        
        if (radarContainer) {
            radarContainer.style.display = 'none';
        }
        if (hierarchicalContainer) {
            hierarchicalContainer.style.display = 'block';
        }
    }

    /**
     * Destroy a specific chart
     */
    destroyChart(canvasId) {
        const chart = this.charts.get(canvasId);
        if (chart) {
            chart.destroy();
            this.charts.delete(canvasId);
        }
    }

    /**
     * Resize all charts
     */
    resizeCharts() {
        this.charts.forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }

    /**
     * Debounced resize handler
     */
    createResizeHandler() {
        let resizeTimeout;
        return () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.resizeCharts();
            }, 250);
        };
    }
}

// Create global chart renderer instance
if (typeof window !== 'undefined') {
    console.log('Initializing chart renderer...');
    window.chartRenderer = new ChartRenderer();
    
    // Add resize event listener
    const resizeHandler = window.chartRenderer.createResizeHandler();
    window.addEventListener('resize', resizeHandler);
    
    // Global functions for backward compatibility
    window.createRadarChart = (canvas, report, profile) => {
        console.log('Global createRadarChart called with:', canvas, report, profile);
        return window.chartRenderer.createRadarChart(canvas, report, profile);
    };
    
    window.createHierarchicalChart = (canvas, report, profile) => {
        console.log('Global createHierarchicalChart called with:', canvas, report, profile);
        return window.chartRenderer.createHierarchicalChart(canvas, report, profile);
    };
    
    window.createScoreEvolutionChart = (canvas, historyData) => {
        console.log('Global createScoreEvolutionChart called with:', canvas, historyData);
        return window.chartRenderer.createScoreEvolutionChart(canvas, historyData);
    };
    
    console.log('Chart functions initialized:', {
        createRadarChart: typeof window.createRadarChart,
        createHierarchicalChart: typeof window.createHierarchicalChart,
        createScoreEvolutionChart: typeof window.createScoreEvolutionChart
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartRenderer;
} else {
    window.ChartRenderer = ChartRenderer;
}