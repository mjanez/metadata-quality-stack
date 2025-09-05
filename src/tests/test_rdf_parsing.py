#!/usr/bin/env python3
"""
Script de prueba para validar el manejo robusto de errores en RDF parsing
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def test_malformed_date_handling():
    """Probar el manejo de fechas mal formateadas en RDF"""
    
    # Crear datos RDF con fecha mal formateada
    malformed_rdf = """
    @prefix dcat: <http://www.w3.org/ns/dcat#> .
    @prefix dct: <http://purl.org/dc/terms/> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
    
    <http://example.org/dataset1> a dcat:Dataset ;
        dct:title "Test Dataset" ;
        dct:issued "20255-01-01T00:00:00"^^xsd:dateTime ;
        dct:modified "2024-12-01T10:30:00"^^xsd:dateTime .
    """
    
    try:
        from api.validators import safe_rdf_parse
        from rdflib import Graph
        
        print("Probando manejo de fechas mal formateadas...")
        
        # Crear grafo y intentar parsing
        g = Graph()
        success = safe_rdf_parse(g, malformed_rdf, "turtle")
        
        if success:
            print(f"✅ Parsing exitoso. Triples cargados: {len(g)}")
            
            # Verificar que el grafo contiene los datos válidos
            for subject, predicate, obj in g:
                print(f"  {predicate}: {obj}")
                
            print("✅ El manejo de errores funciona correctamente")
            return True
        else:
            print("❌ Error en el parsing")
            return False
            
    except ImportError as e:
        print(f"❌ Error de importación: {e}")
        print("Las dependencias no están instaladas (normal en desarrollo)")
        return False
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        return False

def test_normal_rdf_parsing():
    """Probar parsing normal de RDF"""
    
    normal_rdf = """
    @prefix dcat: <http://www.w3.org/ns/dcat#> .
    @prefix dct: <http://purl.org/dc/terms/> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
    
    <http://example.org/dataset1> a dcat:Dataset ;
        dct:title "Test Dataset" ;
        dct:issued "2024-01-01T00:00:00"^^xsd:dateTime ;
        dct:modified "2024-12-01T10:30:00"^^xsd:dateTime .
    """
    
    try:
        from api.validators import safe_rdf_parse
        from rdflib import Graph
        
        print("Probando parsing normal de RDF...")
        
        # Crear grafo y intentar parsing
        g = Graph()
        success = safe_rdf_parse(g, normal_rdf, "turtle")
        
        if success:
            print(f"✅ Parsing exitoso. Triples cargados: {len(g)}")
            print("✅ El parsing normal funciona correctamente")
            return True
        else:
            print("❌ Error en el parsing normal")
            return False
            
    except ImportError as e:
        print(f"❌ Error de importación: {e}")
        return False
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        return False

if __name__ == "__main__":
    print("Probando manejo robusto de errores en parsing RDF...")
    print("=" * 60)
    
    test1 = test_normal_rdf_parsing()
    print()
    test2 = test_malformed_date_handling()
    
    if test1 and test2:
        print("\n🎉 Todos los tests pasaron exitosamente!")
        print("El manejo de errores RDF está funcionando correctamente.")
        sys.exit(0)
    else:
        print("\n❌ Algunos tests fallaron")
        sys.exit(1)