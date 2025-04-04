"""
Visualization module for the Metadata Quality Tool frontend.
This module provides functions for creating data visualizations.
"""
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from typing import Dict, List, Any

from src.frontend.i18n import _, get_metric_label
from src.frontend.config import DIMENSION_COLORS

DIMENSION_LABELS = [
    _("Findability"),
    _("Accessibility"),
    _("Interoperability"),
    _("Reusability"),
    _("Contextuality")
]

def create_dimensions_chart(report: Dict[str, Any]) -> go.Figure:
    """
    Create a bar chart visualization for dimension scores showing both actual and maximum values.
    
    Args:
        report: Quality report data
        
    Returns:
        Plotly figure object
    """    
    scores = [
        report['dimensions']['findability'],
        report['dimensions']['accessibility'],
        report['dimensions']['interoperability'],
        report['dimensions']['reusability'],
        report['dimensions']['contextuality']
    ]
    
    max_scores = [100, 100, 110, 75, 20]
    
    # Calculate percentages for the text display
    percentages = [(score / max_score * 100).round(1) for score, max_score in zip(scores, max_scores)]
    
    # Create figure with two bar traces
    fig = go.Figure()
    
    # Add actual score bars
    fig.add_trace(go.Bar(
        x=DIMENSION_LABELS,
        y=scores,
        name='Actual Score',
        marker_color='rgb(26, 118, 255)',
        text=[f"{score}/{max_score}<br>({percentage}%)" for score, max_score, percentage in zip(scores, max_scores, percentages)],
        textposition='auto',
    ))
    
    # Add maximum score bars (semi-transparent overlay)
    fig.add_trace(go.Bar(
        x=DIMENSION_LABELS,
        y=max_scores,
        name='Maximum Score',
        marker=dict(
            color='rgba(204, 204, 204, 0.5)',  # Light gray with transparency
            line=dict(color='rgba(204, 204, 204, 1.0)', width=1)
        ),
        textposition='auto',
    ))
    
    # Customize layout
    fig.update_layout(
        title="Dimension Scores vs Maximum Values",
        xaxis_title="Dimension",
        yaxis_title="Score",
        barmode='overlay',  # Overlay the two bar sets
        uniformtext=dict(mode="hide", minsize=10),
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1
        )
    )
    
    return fig

def create_radar_chart(report: Dict[str, Any]) -> go.Figure:
    """Create a radar chart visualization for dimension scores."""
    scores = [
        report['dimensions']['findability'] / 100 * 100,
        report['dimensions']['accessibility'] / 100 * 100,
        report['dimensions']['interoperability'] / 110 * 100,
        report['dimensions']['reusability'] / 75 * 100,
        report['dimensions']['contextuality'] / 20 * 100
    ]
    
    # Add the first value again to close the loop
    DIMENSION_LABELS.append(DIMENSION_LABELS[0])
    scores.append(scores[0])
    
    # Create radar chart
    fig = go.Figure()
    
    # Add traces con los colores personalizados
    fig.add_trace(go.Scatterpolar(
        r=scores,
        theta=DIMENSION_LABELS,
        fill='toself',
        fillcolor='rgba(45, 69, 157, 0.3)',
        line=dict(color='#2d459d', width=2),
        name=_("Quality Score (%)"),
        hovertemplate="<b style='color: #2d459d; font-size: 14px'>%{theta}</b><br>" +
                     "Score: %{r:.1f}%<br>" +
                     "<extra></extra>"
    ))
    
    # Actualizar el layout con más configuraciones y etiquetas personalizadas
    fig.update_layout(
        polar=dict(
            radialaxis=dict(
                visible=True,
                range=[0, 100],
                ticksuffix='%',
                tickfont=dict(size=12, color='#2d459d'),
                gridcolor='rgba(0, 0, 0, 0.1)',
                title=dict(
                    text="Score (%)",
                    font=dict(size=14, color='#2d459d', weight='bold')
                )
            ),
            angularaxis=dict(
                tickfont=dict(
                    size=14,
                    color='#2d459d'
                ),
                ticktext=[f'<b style="font-size: 16px; color: #2d459d">{d}</b>' 
                         for d in DIMENSION_LABELS[:-1]],
                tickvals=list(range(len(DIMENSION_LABELS)-1)),
                gridcolor='rgba(0, 0, 0, 0.1)'
            )
        ),
        showlegend=False,
        title=dict(
            text=_("Quality dimensions Radar"),
            font=dict(size=16, weight='bold')
        ),
        width=500,
        height=500,
        margin=dict(t=50, b=50, l=50, r=50)
    )
    
    return fig

def create_score_evolution_chart(history: List[Dict[str, Any]]) -> go.Figure:
    """
    Create a line chart visualization for score evolution over time.
    
    Args:
        history: List of historical quality reports
        
    Returns:
        Plotly figure object
    """
    # Create a DataFrame for the history
    history_df = pd.DataFrame([
        {
            'Date': h['created'],
            'Score': h['totalScore'],
            'Rating': h['rating']
        }
        for h in history
    ])
    
    # Sort by date
    history_df = history_df.sort_values('Date')
    
    # Create line chart
    fig = px.line(
        history_df,
        x='Date',
        y='Score',
        title="Total Quality Score Over Time",
        markers=True,
    )
    
    fig.update_layout(
        xaxis_title="Assessment Date",
        yaxis_title="Total Score",
        yaxis_range=[0, 405],
    )
    
    return fig

def create_dimensions_evolution_chart(history: List[Dict[str, Any]]) -> go.Figure:
    """
    Create a line chart visualization for dimension scores evolution over time.
    
    Args:
        history: List of historical quality reports
        
    Returns:
        Plotly figure object
    """
    # Create a DataFrame for the history
    history_df = pd.DataFrame([
        {
            'Date': h['created'],
            'Findability': h['dimensions']['findability'],
            'Accessibility': h['dimensions']['accessibility'],
            'Interoperability': h['dimensions']['interoperability'],
            'Reusability': h['dimensions']['reusability'],
            'Contextuality': h['dimensions']['contextuality']
        }
        for h in history
    ])
    
    # Sort by date
    history_df = history_df.sort_values('Date')
    
    # Melt the DataFrame for easier plotting
    melted_df = pd.melt(
        history_df,
        id_vars=['Date'],
        value_vars=['Findability', 'Accessibility', 'Interoperability', 'Reusability', 'Contextuality'],
        var_name='Dimension',
        value_name='Score'
    )
    
    # Create line chart
    fig = px.line(
        melted_df,
        x='Date',
        y='Score',
        color='Dimension',
        title="Dimension Scores Over Time",
        markers=True,
    )
    
    fig.update_layout(
        xaxis_title="Assessment Date",
        yaxis_title="Score",
    )
    
    return fig

def create_metrics_table(report: Dict[str, Any], dimension: str = None) -> pd.DataFrame:
    """
    Create a formatted DataFrame for metrics display.
    
    Args:
        report: Quality report data
        dimension: Optional dimension to filter by
        
    Returns:
        Pandas DataFrame with formatted metrics
    """
    if not report.get('metrics'):
        return pd.DataFrame()
    
    # Create DataFrame from metrics
    metrics_df = pd.DataFrame(report['metrics'])
    
    # Filter by dimension if specified
    if dimension and dimension in metrics_df['dimension'].values:
        metrics_df = metrics_df[metrics_df['dimension'] == dimension]
    
    # Format the DataFrame
    display_df = metrics_df[['id', 'count', 'population', 'percentage', 'points', 'weight']].copy()
    display_df['percentage'] = (display_df['percentage'] * 100).round(1)
    display_df.columns = ['Metric', 'Count', 'Total', 'Percentage (%)', 'Points', 'Max Points']
    
    return display_df

def create_hierarchical_dimension_chart(report: Dict[str, Any]) -> go.Figure:
    """Create a hierarchical radial chart (sunburst) for dimension and metric scores."""
    try:
        metrics = report.get('metrics', [])
        
        if not metrics:
            st.warning("No metrics data available")
            return go.Figure()

        # Base data structure con máximos por dimensión
        dimension_data = {
            "findability": {"metrics": [], "max": 100},
            "accessibility": {"metrics": [], "max": 100},
            "interoperability": {"metrics": [], "max": 110},
            "reusability": {"metrics": [], "max": 75},
            "contextuality": {"metrics": [], "max": 20}
        }

        # Clasificar métricas por dimensión
        for metric in metrics:
            dim = metric['dimension'].lower()
            if dim in dimension_data:
                metric_value = metric['points']
                dimension_data[dim]["metrics"].append({
                    "id": metric['id'],
                    "label": metric.get('label_es' if st.session_state.get('language', 'en') == 'es' else 'label_en', metric['id']),
                    "points": metric_value,
                    "weight": metric["weight"]
                })

        # Preparar listas para el gráfico
        total_score = int(round(report['totalScore'], 0))
        ids = ['total']
        # Usar HTML para dar formato a la etiqueta del Total con color #2d459d
        labels = [f'<span style="font-size: 20px; color: #2d459d; font-weight: bold">Total: {total_score}/405</span>']    
        parents = ['']
        values = [405]
        marker_colors = ['#cfe2f3']  # Cambiar de 'lightgrey' a '#cfe2f3'
        
        # Añadir dimensiones y sus métricas
        for dim_name, dim_info in dimension_data.items():
            dim_score = report['dimensions'][dim_name]
            max_score = dim_info['max']
            
            # Añadir dimensión usando su máximo posible
            dim_id = f"dim_{dim_name}"
            # Redondear el score de la dimensión a un decimal
            dim_label = f"{_(dim_name.capitalize())}: {dim_score:.1f}/{max_score}"
            
            ids.append(dim_id)
            labels.append(dim_label)
            parents.append('total')
            values.append(max_score)
            marker_colors.append(DIMENSION_COLORS[dim_name])

            # Añadir métricas usando sus valores reales
            for metric in dim_info["metrics"]:
                metric_id = f"metric_{metric['id']}"
                metric_points = metric["points"]
                metric_weight = metric["weight"]
                
                # Redondear los puntos de la métrica a un decimal
                ids.append(metric_id)
                labels.append(f"{metric['label']}: {metric_points:.1f}/{metric_weight}")
                parents.append(dim_id)
                values.append(metric_points)
                marker_colors.append(f"{DIMENSION_COLORS[dim_name]}80")

        # Crear el gráfico con branchvalues="total"
        fig = go.Figure(go.Sunburst(
            ids=ids,
            labels=labels,
            parents=parents,
            values=values,
            branchvalues="total",
            marker=dict(colors=marker_colors),
            textfont=dict(size=11),
            insidetextfont=dict(size=11),
            # Personalizar el hover para mostrar el Parent solo en las métricas
            hovertemplate='%{customdata}<extra></extra>'
        ))

        # Crear customdata para el hover personalizado
        customdata = []
        for i, (id_val, value) in enumerate(zip(ids, values)):
            if id_val == 'total':
                # Para el total (sin mostrar Score)
                customdata.append(f'<b style="color: #2d459d">{labels[i]}</b>')
            elif id_val.startswith('dim_'):
                # Para las dimensiones
                customdata.append(
                    f'<b style="color: #2d459d">{labels[i]}</b><br>' +
                    f'Score: {value:.1f}'
                )
            else:
                # Para las métricas
                customdata.append(
                    f'<b style="color: #2d459d">{labels[i]}</b><br>' +
                    f'Score: {value:.1f}'
                )

        # Actualizar la figura con los datos personalizados
        fig.update_traces(customdata=customdata)

        # Configurar layout
        fig.update_layout(
            title=_("Quality Scores by Dimension and Metric"),
            width=700,
            height=700,
            margin=dict(t=50, l=0, r=0, b=0)
        )

        return fig

    except Exception as e:
        st.error(f"Error creating hierarchical chart: {str(e)}")
        st.exception(e)
        return go.Figure()