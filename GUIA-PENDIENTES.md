# Anexo A — Qué cubre el código y qué hay que declarar como simulado

| Punto del esquema | Estado | Nota |
|---|---|---|
| 1.1 Contexto del negocio | ⚠️ Parcial | Empresa simulada; el sector y los datos del catálogo son reales en el sistema |
| 1.2 Análisis del problema | ⚠️ Parcial | FODA y stakeholders derivados del código; el **impacto actual** es simulado |
| 1.3 Propuesta de valor | ✅ Cubierto | Los 3 diferenciadores son verificables |
| 1.4 Modelado del negocio | ⚠️ Parcial | Canvas y procesos derivados del código; los KPIs son medibles pero **sin datos históricos** |
| 2.1 Arquitectura general | ✅ Cubierto | ⚠️ La justificación tecnológica **no coincide** con Node+Express+Prisma |
| 2.2 Diseño de base de datos | ✅ Cubierto | Modelo E-R y diccionario completos |
| 2.3 Diseño de API | ✅ Cubierto | 52 endpoints con petición, respuesta y errores reales |
| 2.4 Diseño UI/UX | ⚠️ Parcial | Mapa de pantallas, usabilidad y responsividad documentados; **los wireframes hay que dibujarlos** |
| 3.1 Frontend | ✅ Cubierto | Estructura, estado, consumo de API, formularios y librerías |
| 3.2 Base de datos | ⚠️ Parcial | Relaciones e integridad completas; **no hay Prisma**, son scripts SQL |
| 4.1 Impacto en el negocio | ⚠️ Simulado | La mejora de proceso es real; las cifras antes/después no |
| 4.2 Limitaciones y mejoras | ✅ Cubierto | Escalabilidad y seguridad con hallazgos concretos |
| 4.3 Pitch ejecutivo | ✅ Cubierto | Redactado arriba |

**Lo que todavía tienes que producir a mano:** los **wireframes o mockups** del
punto 2.4 (puedes capturar las pantallas ya construidas y anotarlas), el
**Business Model Canvas** en formato de lienzo visual, y el **diagrama E-R** en
una herramienta de diagramas si el docente lo quiere en notación formal
(el modelo textual de la sección 2.2 tiene todo lo necesario).
