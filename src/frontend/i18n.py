"""
Internationalization module for the Metadata Quality Tool.
This module provides functions for translating texts in the application.
"""
import streamlit as st
import os
import gettext
from typing import Dict, Optional

from src.frontend.config import MARKDOWN_TEXTS, METRIC_LABELS, RATING_TABLES

# Define available languages
LANGUAGES = {
    'en': 'English',
    'es': 'Español'
}

# Path to locale directory, relative to this file
LOCALE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'locale')

# Get the default language from environment or set to English
DEFAULT_LANGUAGE = os.environ.get('MQT_LANGUAGE', 'en')

# Create translations dictionary
_translations: Dict[str, gettext.NullTranslations] = {}

def get_rating_table(profile, language):
    """
    Get the rating table for a specific profile and language.
    
    Args:
        profile: The profile to get the rating table for (e.g., 'dcat_ap_es', 'nti_risp')
        language: The language code ('en', 'es', etc.)
        
    Returns:
        The markdown text of the rating table
    """
    # Obtener la tabla para el perfil y lenguaje especificados, con fallbacks
    profile_tables = RATING_TABLES.get(profile, RATING_TABLES.get('dcat_ap_es', {}))
    return profile_tables.get(language, profile_tables.get('en', 'Rating table not available'))

def get_translation(lang: str = DEFAULT_LANGUAGE) -> gettext.NullTranslations:
    """
    Get translation for the specified language.
    
    Args:
        lang: Language code ('en', 'es', etc.)
        
    Returns:
        Translation object for the language
    """
    # Si el idioma solicitado es inglés, retornar NullTranslations directamente
    if lang == 'en':
        return gettext.NullTranslations()
        
    if lang not in _translations:
        try:
            _translations[lang] = gettext.translation(
                'mqa',  # Domain name
                localedir=LOCALE_DIR,
                languages=[lang]
            )
        except FileNotFoundError:
            # Fallback to NullTranslations if no translation file found
            _translations[lang] = gettext.NullTranslations()
    
    return _translations[lang]

def set_language(lang: str) -> None:
    """
    Set the current language for the application.
    Installs the gettext functions in the built-in namespace.
    
    Args:
        lang: Language code ('en', 'es', etc.)
    """
    global DEFAULT_LANGUAGE
    
    if lang in LANGUAGES:
        DEFAULT_LANGUAGE = lang
        translation = get_translation(lang)
        translation.install(names=['gettext', 'ngettext', 'pgettext', 'npgettext'])

# Initialize translations with the default language
set_language(DEFAULT_LANGUAGE)

# Convenience function to get translation
def _(text: str) -> str:
    """
    Translate text to the current language.
    
    Args:
        text: Text to translate
        
    Returns:
        Translated text
    """
    translation = get_translation(DEFAULT_LANGUAGE)
    return translation.gettext(text)

def get_markdown(key, profile=None):
    """
    Get markdown text in the current language.
    For rating_table, uses profile-specific values if provided.
    """
    language = st.session_state.language if hasattr(st.session_state, 'language') else DEFAULT_LANGUAGE
    
    # Special handling for rating_table when profile is provided
    if key == "rating_table" and profile is not None:
        return get_rating_table(profile, language)
    
    # Normal handling for other markdown texts
    return MARKDOWN_TEXTS.get(key, {}).get(language, MARKDOWN_TEXTS.get(key, {}).get(DEFAULT_LANGUAGE, f"Missing text for key: {key}"))

def get_metric_label(metric_id: str, lang: str = None) -> str:
    """
    Obtener la etiqueta localizada para una métrica.
    
    Args:
        metric_id: Identificador de la métrica
        lang: Código de idioma ('en', 'es', etc.)
        
    Returns:
        Etiqueta localizada o el ID original si no se encuentra traducción
    """
    if lang is None:
        if hasattr(st, 'session_state') and 'language' in st.session_state:
            lang = st.session_state.language
        else:
            lang = DEFAULT_LANGUAGE
            
    if metric_id in METRIC_LABELS and lang in METRIC_LABELS[metric_id]:
        return METRIC_LABELS[metric_id][lang]
    
    # Fallback a inglés
    if metric_id in METRIC_LABELS and 'en' in METRIC_LABELS[metric_id]:
        return METRIC_LABELS[metric_id]['en']
        
    # Fallback por defecto
    return metric_id.replace("_", " ").capitalize()
