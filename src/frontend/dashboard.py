"""
Dashboard module for the Metadata Quality Tool frontend.
This module provides analytics and trend analysis for metadata quality reports.
"""
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import urllib.parse
import requests
import os
from typing import Dict, List, Any, Optional

from src.frontend.config import DIMENSION_COLORS

def display_dashboard(api_base_url: str = None):
    """
    Display the analytics dashboard for metadata quality reports.
    
    Args:
        api_base_url: Base URL for the API
    """
    # Use the provided API URL or fallback to the environment variable
    if api_base_url is None:
        api_base_url = os.environ.get("API_BASE_URL", "http://api:80")
        
    st.title("Metadata Quality Analytics Dashboard")
    st.write("Analyze trends and statistics across all evaluated catalogs")
    
    # Date range selection
    st.subheader("Filter by Date Range")
    
    col1, col2 = st.columns(2)
    with col1:
        # Default to last 30 days
        default_start = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        start_date = st.date_input("Start date", value=datetime.strptime(default_start, "%Y-%m-%d"))
    
    with col2:
        end_date = st.date_input("End date", value=datetime.now())
    
    # Convert to string format
    start_date_str = start_date.strftime("%Y-%m-%d")
    end_date_str = end_date.strftime("%Y-%m-%d")
    
    # Get reports in the date range
    try:
        response = requests.get(
            f"{api_base_url}/reports/by-date",
            params={"start_date": start_date_str, "end_date": end_date_str},
            timeout=30
        )
        
        if response.status_code == 200:
            reports = response.json()
            if not reports:
                st.info("No reports found in the selected date range.")
                return
        else:
            error_message = response.json().get("detail", "Unknown error")
            st.error(f"Error fetching reports: {error_message}")
            return
            
    except Exception as e:
        st.error(f"Error connecting to API: {str(e)}")
        return
    
    # Display overview statistics
    display_overview_stats(reports)
    
    # Display rating distribution
    display_rating_distribution(reports)
    
    # Display dimension averages
    display_dimension_averages(reports)
    
    # Display top and bottom catalogs
    display_top_bottom_catalogs(reports)
    
    # Display dimension correlations
    display_dimension_correlations(reports)

def display_overview_stats(reports: List[Dict[str, Any]]):
    """
    Display overview statistics for the reports.
    
    Args:
        reports: List of quality reports
    """
    st.subheader("Overview Statistics")
    
    # Calculate statistics
    num_catalogs = len(set(r["source"] for r in reports))
    avg_score = sum(r["totalScore"] for r in reports) / len(reports)
    
    # Count ratings
    ratings = {"Excellent": 0, "Good": 0, "Sufficient": 0, "Bad": 0}
    for r in reports:
        ratings[r["rating"]] += 1
    
    # Create columns for metrics
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Catalogs Analyzed", num_catalogs)
    
    with col2:
        st.metric("Total Assessments", len(reports))
    
    with col3:
        st.metric("Average Score", f"{avg_score:.1f}/405")
    
    with col4:
        # Find the most common rating
        most_common_rating = max(ratings.items(), key=lambda x: x[1])[0]
        st.metric("Most Common Rating", most_common_rating)

def display_rating_distribution(reports: List[Dict[str, Any]]):
    """
    Display the distribution of ratings.
    
    Args:
        reports: List of quality reports
    """
    st.subheader("Rating Distribution")
    
    # Count ratings
    ratings = {"Excellent": 0, "Good": 0, "Sufficient": 0, "Bad": 0}
    for r in reports:
        ratings[r["rating"]] += 1
    
    # Create DataFrame for visualization
    df = pd.DataFrame({
        "Rating": list(ratings.keys()),
        "Count": list(ratings.values())
    })
    
    # Create a color mapping with green tones for top ratings, orange for sufficient, red for bad
    color_map = {
        "Excellent": "#00A36C",  # Darker green
        "Good": "#4CAF50",       # Lighter green
        "Sufficient": "#FFA500", # Orange
        "Bad": "#E74C3C"         # Red
    }
    
    # Create bar chart
    fig = px.bar(
        df,
        x="Rating",
        y="Count",
        color="Rating",
        title="Distribution of Quality Ratings",
        color_discrete_map=color_map
    )
    
    fig.update_layout(
        xaxis_title="Rating",
        yaxis_title="Number of Reports",
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
    )
    
    st.plotly_chart(fig, use_container_width=True)

def display_dimension_averages(reports: List[Dict[str, Any]]):
    """
    Display average scores for each dimension.
    
    Args:
        reports: List of quality reports
    """
    st.subheader("Average Dimension Scores")
    
    # Calculate average scores
    avg_scores = {
        "Findability": sum(r["dimensions"]["findability"] for r in reports) / len(reports),
        "Accessibility": sum(r["dimensions"]["accessibility"] for r in reports) / len(reports),
        "Interoperability": sum(r["dimensions"]["interoperability"] for r in reports) / len(reports),
        "Reusability": sum(r["dimensions"]["reusability"] for r in reports) / len(reports),
        "Contextuality": sum(r["dimensions"]["contextuality"] for r in reports) / len(reports)
    }
    
    # Create DataFrame for visualization
    df = pd.DataFrame({
        "Dimension": list(avg_scores.keys()),
        "Average Score": list(avg_scores.values()),
        "Maximum": [100, 100, 110, 75, 20]
    })
    
    # Calculate percentages
    df["Percentage"] = (df["Average Score"] / df["Maximum"] * 100).round(1)
    
    # Map dimension names to lowercase for color mapping
    dimension_to_key = {
        "Findability": "findability",
        "Accessibility": "accessibility",
        "Interoperability": "interoperability",
        "Reusability": "reusability",
        "Contextuality": "contextuality"
    }
    
    # Create bar chart with dimension-specific colors
    fig = px.bar(
        df,
        x="Dimension",
        y="Percentage",
        color="Dimension",
        title="Average Dimension Scores (%)",
        labels={"Percentage": "Score (%)"},
        color_discrete_map={dim: DIMENSION_COLORS[dimension_to_key[dim]] for dim in df["Dimension"]}
    )
    
    fig.update_layout(
        xaxis_title="Dimension",
        yaxis_title="Average Score (%)",
        yaxis_range=[0, 100],
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    # Create a more detailed table
    st.write("Detailed Dimension Statistics:")
    
    # Calculate min and max scores
    min_scores = {
        "Findability": min(r["dimensions"]["findability"] for r in reports),
        "Accessibility": min(r["dimensions"]["accessibility"] for r in reports),
        "Interoperability": min(r["dimensions"]["interoperability"] for r in reports),
        "Reusability": min(r["dimensions"]["reusability"] for r in reports),
        "Contextuality": min(r["dimensions"]["contextuality"] for r in reports)
    }
    
    max_scores = {
        "Findability": max(r["dimensions"]["findability"] for r in reports),
        "Accessibility": max(r["dimensions"]["accessibility"] for r in reports),
        "Interoperability": max(r["dimensions"]["interoperability"] for r in reports),
        "Reusability": max(r["dimensions"]["reusability"] for r in reports),
        "Contextuality": max(r["dimensions"]["contextuality"] for r in reports)
    }
    
    # Create detailed DataFrame
    detailed_df = pd.DataFrame({
        "Dimension": list(avg_scores.keys()),
        "Average": [round(score, 1) for score in avg_scores.values()],
        "Minimum": list(min_scores.values()),
        "Maximum": list(max_scores.values()),
        "Max Possible": [100, 100, 110, 75, 20],
        "Percentage": df["Percentage"].values
    })
    
    st.dataframe(detailed_df, use_container_width=True)

def display_top_bottom_catalogs(reports: List[Dict[str, Any]], top_n: int = 5):
    """
    Display top and bottom performing catalogs.
    
    Args:
        reports: List of quality reports
        top_n: Number of top/bottom catalogs to display
    """
    st.subheader("Top and Bottom Performing Catalogs")
    
    # Group by source and get the latest report for each
    catalogs = {}
    for r in reports:
        source = r["source"]
        created = r["created"]
        
        if source not in catalogs or created > catalogs[source]["created"]:
            catalogs[source] = r
    
    # Convert to list
    catalog_list = list(catalogs.values())
    
    # Sort by total score
    sorted_catalogs = sorted(catalog_list, key=lambda x: x["totalScore"], reverse=True)
    
    # Display top catalogs
    st.write(f"Top {top_n} Performing Catalogs:")
    
    top_df = pd.DataFrame([
        {
            "Catalog": c["source"],
            "Score": c["totalScore"],
            "Rating": c["rating"],
            "Last Assessed": c["created"]
        }
        for c in sorted_catalogs[:top_n]
    ])
    
    st.dataframe(top_df, use_container_width=True)
    
    # Display bottom catalogs
    st.write(f"Bottom {top_n} Performing Catalogs:")
    
    bottom_df = pd.DataFrame([
        {
            "Catalog": c["source"],
            "Score": c["totalScore"],
            "Rating": c["rating"],
            "Last Assessed": c["created"]
        }
        for c in sorted_catalogs[-top_n:]
    ])
    
    st.dataframe(bottom_df, use_container_width=True)

def display_dimension_correlations(reports: List[Dict[str, Any]]):
    """
    Display correlations between dimensions.
    
    Args:
        reports: List of quality reports
    """
    st.subheader("Dimension Correlations")
    
    # Ensure we have enough reports for correlation calculation
    if len(reports) < 2:
        st.info("Need at least 2 reports to calculate correlations.")
        return
    
    try:
        # Create DataFrame with dimension scores
        df = pd.DataFrame([
            {
                "Findability": r["dimensions"]["findability"],
                "Accessibility": r["dimensions"]["accessibility"],
                "Interoperability": r["dimensions"]["interoperability"],
                "Reusability": r["dimensions"]["reusability"],
                "Contextuality": r["dimensions"]["contextuality"],
                "Total": r["totalScore"]
            }
            for r in reports
        ])
        
        # Check for zero variance (constant values)
        constant_columns = []
        for col in df.columns:
            if df[col].std() == 0:
                constant_columns.append(col)
        
        # Remove constant columns for correlation calculation
        if constant_columns:
            st.warning(f"The following dimensions have constant values and were excluded from correlation: {', '.join(constant_columns)}")
            df = df.drop(columns=constant_columns)
            
        # Only calculate if we have at least 2 non-constant dimensions
        if len(df.columns) >= 2:
            # Calculate correlation matrix
            corr = df.corr().round(2)
            
            # Create heatmap with custom colors
            fig = px.imshow(
                corr,
                text_auto=True,
                color_continuous_scale="RdBu_r",
                title="Correlation Between Dimensions",
                zmin=-1,
                zmax=1
            )
            
            fig.update_layout(
                height=600,
                width=700,
                plot_bgcolor="rgba(0,0,0,0)",
                paper_bgcolor="rgba(0,0,0,0)",
            )
            
            st.plotly_chart(fig, use_container_width=True)
            
            st.write("""
            **Interpretation**:
            - Values close to 1 indicate strong positive correlation (dimensions tend to have high scores together)
            - Values close to -1 indicate strong negative correlation (when one dimension has high scores, the other tends to have low scores)
            - Values close to 0 indicate weak or no correlation
            """)
        else:
            st.info("Not enough variable dimensions to calculate correlations.")
    except Exception as e:
        st.error(f"Error calculating correlations: {str(e)}")
        st.info("Try selecting a date range with more diverse reports.")

if __name__ == "__main__":
    display_dashboard()