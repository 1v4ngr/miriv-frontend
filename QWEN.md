# Instrucciones del frontend MIRIV

@../QWEN.md

Las rutas docs/seguimiento-enologico y .qwen/skills de las instrucciones importadas se refieren a la raíz MIRIV, un nivel por encima de este repositorio. Para consultar el índice desde aquí, abre [INDICE.md](../docs/seguimiento-enologico/INDICE.md).

Consulta la ficha UI correspondiente antes de editar una pantalla. La revisión inicial encontró React, TypeScript, Vite, Tailwind y ECharts; revalida package.json y conserva las convenciones existentes.

Comprueba si el servicio usa datos simulados o API real. No presentes una maqueta como flujo integrado. Los diseños HTML existentes en styles son referencias visuales; contrasta su comportamiento con la especificación UI y sus requisitos funcionales.

Mantén identidad de contenido, unidades, fechas, validez, permisos, estados de carga y conflictos. El botón Guardar no equivale a Validar y una respuesta incierta no equivale a operación fallida. La compilación npm run build está declarada en package.json; comprueba los scripts actuales antes de ejecutarla y no inventes un comando de tests.

Las skills comunes están en ../.qwen/skills. Si no se descubren desde esta raíz Git, lee el archivo SKILL.md correspondiente o inicia Qwen Code desde MIRIV.

