# EXPLICACIÓN DE LAS PRUEBAS PARA LA DEFENSA — EMSE

## Resultado que puedo defender

La plataforma tiene una base técnica sólida demostrada por 111 pruebas unitarias aprobadas, un backend que compila y conecta correctamente con PostgreSQL, un frontend que compila en un entorno limpio y controles básicos que rechazan accesos sin JWT. La evaluación no fue total porque no se proporcionaron credenciales, OTP ni una base aislada en la que fuera seguro crear documentos, notas y usuarios de prueba.

No debo decir “el sistema es 100 % seguro” ni “soporta 400 usuarios”. Debo decir: **el endpoint público probado permaneció estable hasta 400 solicitudes concurrentes en ráfaga; los flujos autenticados requieren una segunda campaña en un ambiente aislado**.

## 1. Auditoría de pruebas existentes

### ¿Qué es?

Es revisar qué pruebas ya tenía el proyecto antes de crear o ejecutar pruebas finales.

### ¿Por qué la hice?

Para no repetir trabajo y saber qué partes de EMSE ya estaban verificadas.

### ¿Cómo se hizo?

Se buscaron archivos Jest, pruebas unitarias, E2E y configuraciones en backend y frontend. Se encontraron 25 archivos unitarios y 4 E2E en backend; no había pruebas automatizadas de frontend.

### ¿Qué demuestra?

Demuestra que existe cobertura importante en RBAC, documental, disciplina, evaluaciones y notificaciones, pero faltan pruebas del frontend y de la autenticación real completa.

### ¿Cómo lo explico en mi defensa?

> “Primero audité las pruebas existentes para evitar duplicarlas. Encontré 25 suites unitarias y cuatro suites integrales en el backend. Las pruebas ya cubren lógica documental y académica, pero detecté que el frontend y la autenticación completa todavía requieren mayor cobertura automatizada.”

## 2. Pruebas unitarias existentes

### ¿Qué es?

Son pruebas pequeñas que verifican una función o servicio de forma aislada.

### ¿Por qué la hice?

Aunque no eran el objetivo principal, servían como línea base antes de las pruebas finales.

### ¿Cómo se hizo?

Se ejecutó Jest sin caché y en una sola secuencia para obtener un resultado reproducible.

### ¿Qué demuestra?

Las 25 suites y las 111 pruebas pasaron. Esto respalda cálculos, validaciones, permisos y partes críticas del workflow, pero no reemplaza una prueba con usuarios reales.

### ¿Cómo lo explico en mi defensa?

> “Como línea base ejecuté todas las pruebas unitarias existentes. El resultado fue 25 suites y 111 casos aprobados. Esto demuestra que la lógica aislada evaluada funciona, aunque por sí sola no garantiza que todo el sistema integrado funcione en producción.”

## 3. Pruebas funcionales de caja negra

### ¿Qué es?

Consiste en usar el sistema por sus entradas visibles, como navegador y API, y comparar la respuesta con lo esperado.

### ¿Por qué la hice?

Porque el proyecto debe demostrar que responde correctamente desde la perspectiva de un usuario, no solo que el código compila.

### ¿Cómo se hizo?

Se abrió el login, se validaron campos obligatorios, se intentó una URL administrativa sin sesión y se enviaron solicitudes directas sin token, con token inválido, usuario inexistente y clave incorrecta.

### ¿Qué demuestra?

El login se presenta correctamente en producción limpia; el navegador redirige una ruta administrativa y el backend responde 401 cuando corresponde. El login correcto y los workflows completos quedaron pendientes por falta de credenciales y entorno aislado.

### ¿Cómo lo explico en mi defensa?

> “Realicé pruebas de caja negra desde el navegador y mediante solicitudes HTTP. Verifiqué el formulario de acceso, sus validaciones y el rechazo de rutas protegidas. Los accesos sin token o con token inválido fueron bloqueados, pero no simulé credenciales ni OTP que no tenía.”

## 4. Pruebas de integración

### ¿Qué es?

Comprueba que varios componentes se comuniquen correctamente.

### ¿Por qué la hice?

EMSE depende de Next.js, NestJS, JWT, Prisma y PostgreSQL; un componente aislado puede funcionar aunque la cadena completa falle.

### ¿Cómo se hizo?

Se ejecutó el arranque E2E de Nest, se validó Prisma, se comprobó PostgreSQL y se construyó el frontend en una copia temporal limpia. También se verificó que una ruta protegida del frontend y la API rechazaran una sesión ausente.

### ¿Qué demuestra?

Demuestra que backend, Prisma y PostgreSQL pueden inicializarse juntos y que el frontend es construible. No demuestra todavía un workflow autenticado completo.

### ¿Cómo lo explico en mi defensa?

> “Las pruebas de integración confirmaron que NestJS inicia con Prisma y PostgreSQL, y que Next.js genera sus rutas en un entorno limpio. Además, la protección existe tanto en la interfaz como en la API. El flujo completo con JWT real quedó como limitación documentada.”

## 5. Pruebas de seguridad y acceso

### ¿Qué es?

Verifica que solo los usuarios autorizados puedan acceder a recursos protegidos.

### ¿Por qué la hice?

La plataforma maneja datos personales, documentos institucionales y notas académicas.

### ¿Cómo se hizo?

Se llamó directamente a usuarios, documentos, cadetes, mis notas y `/autenticacion/me`, evitando depender de botones ocultos. También se compararon respuestas de login inválido.

### ¿Qué demuestra?

Todos los endpoints rechazaron la falta de token. Se detectó una posible diferencia temporal entre usuario real e inexistente. El control fino por rol y sección no se pudo probar con JWT real.

### ¿Cómo lo explico en mi defensa?

> “Probé seguridad directamente contra la API para comprobar que no dependiera solo del frontend. Los recursos protegidos devolvieron 401 sin token o con token inválido. También detecté una diferencia de tiempo en el login que no expone datos por mensaje, pero conviene corregir para reducir un posible canal lateral.”

## 6. Prueba de base de datos

### ¿Qué es?

Revisa conexión, migraciones, restricciones, relaciones y consistencia de los datos.

### ¿Por qué la hice?

PostgreSQL es la fuente principal de usuarios, documentos, historial y notas.

### ¿Cómo se hizo?

Se ejecutaron consultas dentro de una transacción de solo lectura. Prisma validó el esquema y confirmó 39 migraciones aplicadas.

### ¿Qué demuestra?

Se observaron 42 claves primarias, 90 foráneas, 22 checks, cero restricciones no validadas, cero índices inválidos, cero duplicados en claves revisadas y cero huérfanos en ocho relaciones principales.

### ¿Cómo lo explico en mi defensa?

> “La base se evaluó sin modificar datos. Prisma confirmó que el esquema es válido y que las 39 migraciones están actualizadas. Además, las relaciones revisadas no presentaron huérfanos ni duplicados, lo que respalda la integridad referencial observada.”

## 7. Pruebas de carga

### ¿Qué es?

Mide cómo responde el sistema cuando recibe solicitudes concurrentes dentro de un rango esperado.

### ¿Por qué la hice?

EMSE tiene 389 usuarios registrados y es importante conocer el comportamiento ante accesos simultáneos.

### ¿Cómo se hizo?

Se aplicaron ráfagas de 10, 25, 50, 100, 200 y 300 usuarios virtuales al endpoint público `GET /`. Se generaron 2.055 solicitudes.

### ¿Qué demuestra?

Todas respondieron 200. Con 300 concurrentes el promedio fue 87,72 ms y el p95 169,95 ms. El resultado solo corresponde al endpoint raíz.

### ¿Cómo lo explico en mi defensa?

> “Realicé una prueba de carga progresiva desde 10 hasta 300 usuarios virtuales. En total se procesaron 2.055 solicitudes sin errores y el p95 a 300 fue 169,95 milisegundos. Aclaro que esta prueba midió el endpoint público, no los procesos autenticados.”

## 8. Prueba de estrés

### ¿Qué es?

Incrementa la concurrencia para observar degradación, saturación y recuperación.

### ¿Por qué la hice?

Permite conocer cómo crece la latencia y si el servicio vuelve a la normalidad después de una ráfaga fuerte.

### ¿Cómo se hizo?

Se probaron niveles de 50 a 400 concurrentes. Luego se redujo la carga a 10.

### ¿Qué demuestra?

A 400 concurrentes no hubo errores y el p95 fue 202,68 ms. Al bajar a 10, el p95 volvió a 15,84 ms. No se alcanzó saturación en el endpoint raíz.

### ¿Cómo lo explico en mi defensa?

> “La prueba de estrés aumentó progresivamente hasta 400 solicitudes concurrentes. La latencia creció de forma gradual, sin errores, y el servicio recuperó su nivel al reducir la carga. Esto muestra estabilidad del endpoint probado, pero no autoriza afirmar que 400 usuarios pueden ejecutar workflows completos.”

## 9. Pruebas de rendimiento

### ¿Qué es?

Clasifica los tiempos de respuesta de operaciones representativas.

### ¿Por qué la hice?

La rapidez afecta la experiencia de administrativos, operadores y cadetes.

### ¿Cómo se hizo?

Se midieron rutas públicas, rechazos JWT, login inválido, páginas de producción y niveles de carga.

### ¿Qué demuestra?

Todo lo ejecutado quedó por debajo de 500 ms y se clasifica como muy bueno. Las consultas autenticadas de negocio no pudieron medirse.

### ¿Cómo lo explico en mi defensa?

> “Clasifiqué los tiempos con un criterio orientativo. Todas las operaciones realmente medidas estuvieron por debajo de 500 milisegundos. Sin embargo, no presento métricas de listados autenticados o trazabilidad porque no existía una sesión válida para probarlos.”

## 10. Prueba de aceptación

### ¿Qué es?

Recoge la opinión de usuarios reales sobre facilidad, utilidad y satisfacción.

### ¿Por qué la hice?

El éxito institucional no depende únicamente de que el software responda; también debe ser comprensible y útil para la EMSE.

### ¿Cómo se hizo?

Se preparó una encuesta de diez preguntas con escala Likert de 1 a 5. No se inventaron participantes ni resultados.

### ¿Qué demuestra?

Por ahora demuestra que existe un instrumento listo. Las conclusiones solo podrán hacerse después de aplicarlo a personas reales.

### ¿Cómo lo explico en mi defensa?

> “Preparé una prueba de aceptación con diez afirmaciones y escala Likert. Todavía no reporto porcentajes porque la encuesta debe ser respondida por usuarios reales de la EMSE. El porcentaje de aceptación se calculará con las respuestas 4 y 5 sobre el total válido.”

## 11. Caja blanca limitada

### ¿Qué es?

Es revisar caminos internos del código en procesos críticos.

### ¿Por qué la hice?

Autenticación, permisos y workflow documental concentran riesgos importantes.

### ¿Cómo se hizo?

Se identificaron métodos críticos sin modificarlos ni crear nuevas pruebas unitarias.

### ¿Qué demuestra?

Define dónde conviene ampliar cobertura: login/OTP/refresh, combinación de permisos y transiciones transaccionales.

### ¿Cómo lo explico en mi defensa?

> “La caja blanca fue intencionalmente limitada porque el proyecto ya tenía pruebas unitarias. Seleccioné autenticación, guards de permisos y transiciones documentales. Son los procesos donde un error interno podría afectar seguridad o integridad del workflow.”

## 12. Defectos que debo mencionar

### Estado generado del frontend

El `.next` local está corrupto: desarrollo devolvió 404 y el build directo encontró un archivo de rutas generado inválido. El mismo código compiló y respondió 200 en una copia limpia, por lo que no se modificó la fuente durante la auditoría.

### Diferencia temporal del login

Ambos casos devuelven 401 y el mismo mensaje, pero el usuario inexistente fue más lento. Es una observación de seguridad MEDIA, no una prueba de intrusión.

### Recuperación del administrador

El script busca el rol `ADMIN`, pero la plataforma usa `ADMINISTRADOR`. Esto bloquearía la recuperación y tiene severidad ALTA.

### ¿Cómo lo explico en mi defensa?

> “La auditoría no ocultó los defectos. Encontré un problema en archivos generados del frontend, una diferencia temporal en autenticación y un nombre de rol incompatible en el script de recuperación. Se registraron con evidencia y recomendación, pero no se corrigieron porque la tarea exigía mantener intacto el sistema.”

## 13. Limitaciones y siguiente campaña

Para completar los casos **NO EVALUABLES** se necesita:

1. Una copia aislada de PostgreSQL autorizada para pruebas.
2. Credenciales de prueba para ADMINISTRADOR, ADMINISTRATIVO, OPERADOR, RESPONSABLE y CADETE.
3. Acceso controlado al OTP o un proveedor SMTP de pruebas.
4. Datos ficticios documentales y académicos.
5. Herramienta de pruebas sostenidas para endpoints autenticados.

### Cierre oral sugerido

> “La evaluación final demuestra una base funcional y técnica favorable, pero mantiene conclusiones proporcionales a la evidencia. Las pruebas unitarias, de compilación, conexión, integridad y protección básica fueron satisfactorias. Los workflows reales con JWT y los ensayos de carga sobre base de datos quedan pendientes de un entorno aislado, por lo que no afirmo seguridad ni capacidad absoluta.”
