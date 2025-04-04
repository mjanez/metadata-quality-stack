"""
Main Streamlit application for the Metadata Quality Tool frontend.
This module provides a web interface for validating metadata and visualizing reports.
"""
import streamlit as st
import requests
import urllib.parse
import pandas as pd
import json
from datetime import datetime
import plotly.express as px
import plotly.graph_objects as go
import os
from src.frontend.dashboard import display_dashboard
from src.frontend.visualizations import create_hierarchical_dimension_chart, create_radar_chart
from src.frontend.i18n import _, set_language, LANGUAGES, DEFAULT_LANGUAGE, get_markdown, get_metric_label
from src.frontend.config import METRIC_LABELS, PROFILES, FORMAT_MIME_TYPES

# API endpoint (use environment variable or fallback to localhost)
API_BASE_URL = os.environ.get("API_BASE_URL", "http://api:80")

def display_validation_tool():
    """Display the MQA validation interface."""
    # App title
    st.title(_("Metadata Quality Assessment Tool"))
    st.subheader(_("Evaluate the quality of open data catalogs based on FAIR+C principles"))

    # Input section
    st.header(_("Enter Metadata Source"))
    
    # Tabs for different input methods
    tab_url, tab_text = st.tabs([_("URL"), _("Direct Input")])
    
    with tab_url:
        with st.form("url_form"):
            url = st.text_input(
                _("URL of the catalog in RDF/TTL format"),
                placeholder="https://example.com/catalog.rdf",
            )
            col1, col2 = st.columns(2)
            with col1:
                validate_url_button = st.form_submit_button(_("Validate"))
            with col2:
                history_button = st.form_submit_button(_("Show History"))
    
    with tab_text:
        with st.form("text_form"):
            format_selector = st.selectbox(
                _("Format"),
                options=["RDF/XML", "Turtle (TTL)", "JSON-LD", "N-Triples"],
                index=0,
            )
            
            input_text = st.text_area(
                _("Paste RDF content here"),
                height=200,
                max_chars=500000,
                placeholder="<?xml version=\"1.0\"?>\n<rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\"...",
                help=_("Suitable for evaluating individual Datasets/Data Services or small Catalogs (up to 500KB)")
            )
            validate_text_button = st.form_submit_button(_("Validate"))

    # Process URL validation request
    if 'validate_url_button' in locals() and validate_url_button and url:
        status_placeholder = st.empty()
        status_placeholder.info(_("Validating content... This may take a minute."))
        
        try:
            # Call the API to validate the URL
            response = requests.post(
                f"{API_BASE_URL}/validate",
                params={"url": url},
                timeout=60,
            )
            
            if response.status_code == 200:
                report = response.json()
                st.session_state.report = report
                status_placeholder.success(_("Validation complete! Scroll down to see results."))
                status_placeholder.empty()
            else:
                error_message = response.json().get("detail", "Unknown error")
                status_placeholder.error(_("Error validating URL: {0}").format(error_message))
        
        except Exception as e:
            status_placeholder.error(_("Error: {0}").format(str(e)))
    
    # Process direct text validation request
    elif 'validate_text_button' in locals() and validate_text_button and input_text:
        status_placeholder = st.empty()
        status_placeholder.info(_("Validating content... This may take a minute."))
        
        try:
            # Get selected MIME type
            mime_type = FORMAT_MIME_TYPES[format_selector]
            
            # Guardar en el estado de sesión para uso posterior
            st.session_state.last_input_text = input_text
            st.session_state.last_mime_type = mime_type
            
            # Call the API to validate the direct input
            response = requests.post(
                f"{API_BASE_URL}/validate-content",
                json={"content": input_text, "content_type": mime_type},
                timeout=60,
            )
            
            if response.status_code == 200:
                report = response.json()
                st.session_state.report = report
                status_placeholder.success(_("Validation complete! Scroll down to see results."))
                status_placeholder.empty()
            else:
                error_message = response.json().get("detail", "Unknown error")
                status_placeholder.error(_("Error validating URL: {0}").format(error_message))
        
        except Exception as e:
            status_placeholder.error(_("Error: {0}").format(str(e)))
    
    # Handle history request
    elif 'history_button' in locals() and history_button and url:
        st.info(_("Fetching history..."))
        
        try:
            # Encode the URL for the API request
            encoded_url = urllib.parse.quote(url, safe="")
            
            # Call the API to get history
            response = requests.get(
                f"{API_BASE_URL}/history/{encoded_url}",
                timeout=30,
            )
            
            if response.status_code == 200:
                history = response.json()
                st.session_state.history = history
                st.success(_("Found {0} historical reports.").format(len(history)))
            else:
                error_message = response.json().get("detail", "Unknown error")
                st.error(_("Error fetching history: {0}").format(error_message))
        
        except Exception as e:
            st.error(_("Error: {0}").format(str(e)))

    # Display results if available
    if hasattr(st.session_state, "report"):
        report = st.session_state.report
        
        # Overview section
        st.header(_("Quality Assessment Results"))
        
        # Modificar para tener 4 columnas incluyendo las opciones de descarga
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(_("Total Score"), f"{report['totalScore']}/405")
        
        with col2:
            st.metric(_("Rating"), _(report['rating']))
        
        with col3:
            st.metric(_("Assessment Date"), report['created'])
        
        with col4:
            st.write(_("Download Report:"))
            # Determinar si es contenido directo o URL
            is_direct_input = report['source'].startswith('direct-input-')
            
            # Crear dos columnas dentro de col4 para los botones
            dcol1, dcol2 = st.columns(2)
            
            # JSON-LD (DQV)
            try:
                if is_direct_input:
                    # Para contenido directo, solicitar la conversión a JSON-LD usando valores guardados
                    if hasattr(st.session_state, "last_input_text") and hasattr(st.session_state, "last_mime_type"):
                        response = requests.post(
                            f"{API_BASE_URL}/validate-content",
                            json={
                                "content": st.session_state.last_input_text, 
                                "content_type": st.session_state.last_mime_type, 
                                "format": "jsonld"
                            },
                            timeout=30,
                        )
                        
                        if response.status_code == 200:
                            jsonld_report = response.json()
                            with dcol2:
                                st.download_button(
                                    label=":card_file_box: JSON-LD",  # Icono de archivo estructurado
                                    data=json.dumps(jsonld_report, indent=2),
                                    file_name=f"quality_report_dqv_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jsonld",
                                    mime="application/ld+json",
                                    help=_("Download the report in JSON-LD format using DQV vocabulary"),
                                )
                    else:
                        st.warning(_("Cannot generate JSON-LD: input content not available"))
                else:
                    # Para URL, usar el endpoint normal
                    response = requests.post(
                        f"{API_BASE_URL}/validate",
                        params={"url": report['source'], "format": "jsonld"},
                        timeout=30,
                    )
                    
                    if response.status_code == 200:
                        jsonld_report = response.json()
                        with dcol2:
                            st.download_button(
                                label=":card_file_box: JSON-LD",  # Icono de archivo estructurado
                                data=json.dumps(jsonld_report, indent=2),
                                file_name=f"quality_report_dqv_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jsonld",
                                mime="application/ld+json",
                                help=_("Download the report in JSON-LD format using DQV vocabulary"),
                            )
            except Exception as e:
                st.error(_("Error generating JSON-LD report: {0}").format(str(e)))
            
            # Simple JSON
            try:
                if is_direct_input:
                    # Si es contenido directo, usar el reporte que ya tenemos
                    json_report = report
                    with dcol1:
                        st.download_button(
                            label=":page_facing_up: JSON",  # Icono de documento simple
                            data=json.dumps(json_report, indent=2),
                            file_name=f"quality_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                            mime="application/json",
                            help=_("Download the original JSON report"),
                        )
                else:
                    # Si es URL, solicitar a la API
                    response = requests.post(
                        f"{API_BASE_URL}/validate",
                        params={"url": report['source'], "format": "json"},
                        timeout=30,
                    )
                    
                    if response.status_code == 200:
                        json_report = response.json()
                        with dcol1:
                            st.download_button(
                                label=":page_facing_up: JSON",  # Icono de documento simple
                                data=json.dumps(json_report, indent=2),
                                file_name=f"quality_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                                mime="application/json",
                                help=_("Download the original JSON report"),
                            )
            except Exception as e:
                st.error(_("Error generating JSON report: {0}").format(str(e)))

        # Dimension scores with tabs for different visualizations
        st.subheader(_("Dimension Scores"))
        
        # Create tabs for the different visualization types
        tab1, tab2 = st.tabs([_("Hierarchical"), _("Radar")])
        
        with tab1:
            try:
                fig_hierarchical = create_hierarchical_dimension_chart(report)
                
                if fig_hierarchical is not None:
                    try:
                        # Configuración simplificada para el gráfico
                        st.plotly_chart(
                            fig_hierarchical,
                            use_container_width=True,
                        )
                        st.caption(_("Hierarchical view showing the relationship between dimensions and their metrics"))
                    except Exception as display_error:
                        st.error(f"Error displaying chart: {str(display_error)}")
                        st.exception(display_error)
                else:
                    st.warning("Could not create hierarchical chart")
            except Exception as e:
                st.error(f"Error in hierarchical chart section: {str(e)}")
                st.exception(e)
                       
        with tab2:
            # Radar chart
            fig_radar = create_radar_chart(report)
            st.plotly_chart(fig_radar, use_container_width=True)
            st.caption(_("Radar chart showing relative performance across all dimensions"))
        
        # Display detailed metrics in expandable sections
        if report.get('metrics'):
            st.subheader(_("Detailed Metrics"))
            
            # Create a DataFrame for the metrics
            metrics_df = pd.DataFrame(report['metrics'])
            
            # Create tabs for the different dimension metrics
            dimensions = metrics_df['dimension'].unique()
            dimension_tabs = st.tabs([_(dim.capitalize()) for dim in dimensions])
            
            for i, dimension in enumerate(dimensions):
                with dimension_tabs[i]:
                    dim_metrics = metrics_df[metrics_df['dimension'] == dimension]
                    
                    # Create a more readable table with translated metric names
                    display_df = dim_metrics[['id', 'count', 'population', 'percentage', 'points', 'weight']].copy()
                    
                    # Traducir IDs de métricas usando la función helper
                    display_df['id'] = display_df['id'].apply(get_metric_label)
                    
                    display_df['percentage'] = (display_df['percentage'] * 100).round(1)
                    display_df.columns = [_('Metric'), _('Count'), _('Total'), 
                                        _('Percentage (%)'), _('Points'), _('Max Points')]
                    
                    st.dataframe(display_df, use_container_width=True)

            st.caption(_("Detailed metrics for each dimension showing count, percentage, and points"))

    # Display history if available
    if hasattr(st.session_state, "history"):
        history = st.session_state.history
        
        st.header(_("Historical Reports"))
        
        if len(history) > 1:
            # Create a DataFrame for the history
            history_df = pd.DataFrame([
                {
                    'Date': h['created'],
                    'Score': h['totalScore'],
                    'Rating': h['rating'],
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
            
            # Display evolution chart
            st.subheader(_("Score Evolution Over Time"))
            
            fig = px.line(
                history_df,
                x='Date',
                y='Score',
                title=_("Total Quality Score Over Time"),
                markers=True,
            )
            
            fig.update_layout(
                xaxis_title=_("Assessment Date"),
                yaxis_title=_("Total Score"),
                yaxis_range=[0, 405],
            )
            
            st.plotly_chart(fig, use_container_width=True)
            
            # Display dimension evolution
            st.subheader(_("Dimension Scores Over Time"))
            
            # Melt the DataFrame for easier plotting
            melted_df = pd.melt(
                history_df,
                id_vars=['Date'],
                value_vars=['Findability', 'Accessibility', 'Interoperability', 'Reusability', 'Contextuality'],
                var_name='Dimension',
                value_name='Score'
            )
            
            fig = px.line(
                melted_df,
                x='Date',
                y='Score',
                color='Dimension',
                title=_("Dimension Scores Over Time"),
                markers=True,
            )
            
            fig.update_layout(
                xaxis_title=_("Assessment Date"),
                yaxis_title=_("Score"),
            )
            
            st.plotly_chart(fig, use_container_width=True)
            
        # Display all historical reports in a table
        with st.expander(_("All Historical Reports"), expanded=False):
            for i, h in enumerate(sorted(history, key=lambda x: x['created'], reverse=True)):
                st.subheader(_("Report from {0}").format(h['created']))
            
                col1, col2 = st.columns(2)
                
                with col1:
                    st.metric("Total Score", f"{h['totalScore']}/405")
                    st.metric("Rating", h['rating'])
                
                with col2:
                    st.write(_("Dimension Scores:"))
                    st.write(f"- {_('Findability')}: {h['dimensions']['findability']}/100")
                    st.write(f"- {_('Accessibility')}: {h['dimensions']['accessibility']}/100")
                    st.write(f"- {_('Interoperability')}: {h['dimensions']['interoperability']}/110")
                    st.write(f"- {_('Reusability')}: {h['dimensions']['reusability']}/75")
                    st.write(f"- {_('Contextuality')}: {h['dimensions']['contextuality']}/20")
                
                if i < len(history) - 1:  # Don't add a divider after the last item
                    st.divider()


# Page configuration
st.set_page_config(
    page_title="Metadata Quality Tool",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Sidebar with info and navigation
with st.sidebar:
    st.header(_("About"))
    st.markdown(get_markdown("about_text"))

    # Add Profile selector
    st.header(_("Compliance"))
    current_lang = st.selectbox(
        _("Select profile"),
        options=list(PROFILES.keys()),
        format_func=lambda x: PROFILES[x],
        index=list(PROFILES.keys()).index('dcat_ap_es')
    )
    
    # Add language selector
    st.header(_("Language"))
    current_lang = st.selectbox(
        _("Select language"),
        options=list(LANGUAGES.keys()),
        format_func=lambda x: LANGUAGES[x],
        index=list(LANGUAGES.keys()).index(DEFAULT_LANGUAGE)
    )
    
    # When language changes
    if 'language' not in st.session_state or st.session_state.language != current_lang:
        st.session_state.language = current_lang
        set_language(current_lang)
        st.rerun() 
    
    st.header(_("Rating"))
    st.markdown(get_markdown("rating_table"))
    
    # Navigation
    st.header(_("Navigation"))
    if 'current_page' not in st.session_state:
        st.session_state.current_page = _("MQA validation")


    page = st.sidebar.radio(
        _("Go to:"),
        options=[_("MQA validation"), _("Analytics Dashboard")],
        index=0 if st.session_state.current_page == _("MQA validation") else 1,
        horizontal=True,
        key="navigation_radio"
    )

    st.session_state.current_page = page

# Based on selection, show either the MQA validation or the dashboard
if page == _("MQA validation"):
    display_validation_tool()
else:
    display_dashboard(API_BASE_URL)

st.sidebar.info(get_markdown("learn_more_link"))

if __name__ == "__main__":
    pass 