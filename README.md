# cercanIA
Medición de la CercanIA con la IA

Los asistentes a una charla responden con un dial. El profesor decide en qué fase está la dinámica y ve los resultados en un tablero.

Las cuatro fases, en el orden de la dinámica:

| Fase | Momento | Pregunta | Extremos del dial |
| --- | --- | --- | --- |
| 1 | Antes de la charla | ¿Qué tanto has usado la IA hoy? | Nada — Todo el día |
| 2 | Después de la charla | ¿Qué tanto has usado la IA hoy? | Nada — Todo el día |
| 3 | Inicio del curso | ¿Qué tan seguro te sientes usando la IA? | Nada seguro — Muy seguro |
| 4 | Final del curso | ¿Qué tan seguro te sientes usando la IA? | Nada seguro — Muy seguro |

Los estudiantes no ven los momentos ("antes", "después"): solo un número grande, "Pregunta 1 de 4", con la pregunta debajo. Los momentos son para el profesor.

Las comparaciones que el profesor puede mostrar son **Uso (fases 1 y 2)**, **Confianza (fases 3 y 4)** y **las cuatro juntas**.

Las preguntas están en las listas `PHASES`, `PAIRS` y `COMPARISONS`, al principio del `<script>` de `index.html`. Para cambiar un texto o añadir otra fase, edita esas listas y, si añades fases, la lista `TOTAL_PHASES` de `apps-script/Code.gs`.

- `index.html`: toda la aplicación. Se publica tal cual en GitHub Pages.
- `apps-script/Code.gs`: guarda las respuestas en una hoja de Google Sheets.

## 1. Preparar Google Sheets (una sola vez)

1. Crea una hoja nueva en [Google Sheets](https://sheets.new).
2. Menú **Extensiones → Apps Script**. Borra lo que haya en `Código.gs`, pega el contenido de [`apps-script/Code.gs`](apps-script/Code.gs) y guarda.
3. **Configuración del proyecto** (engranaje) → **Propiedades del script** → añade `ADMIN_KEY` con una clave que solo conozca el profesor.
4. **Implementar → Nueva implementación → Aplicación web**, con "Ejecutar como: **Yo**" y "Quién tiene acceso: **Cualquier usuario**". Autoriza los permisos.
5. Copia la URL que termina en `/exec` y pégala en `SCRIPT_URL` al principio del `<script>` de `index.html`.

Si más adelante cambias `Code.gs`: **Implementar → Gestionar implementaciones → Editar → Nueva versión** (así la URL no cambia).

## 2. Publicar en GitHub Pages

1. Sube los cambios a GitHub.
2. En el repositorio: **Settings → Pages → Build and deployment**: "Deploy from a branch", rama `main`, carpeta `/ (root)`.
3. En un par de minutos queda en `https://<usuario>.github.io/cercanIA/`.

## 3. Uso

- **Estudiantes:** abren `https://<usuario>.github.io/cercanIA/`, escriben su nombre y eligen su avatar. La aplicación les da un **código personal** de 5 caracteres.
- **Volver semanas después:** en la pantalla de entrada, "Ya participé antes y tengo mi código" recupera sus respuestas, incluso desde otro teléfono. Conviene pedirles que lo anoten o lo fotografíen el primer día.
- **Profesor:** `https://<usuario>.github.io/cercanIA/?view=admin` (o doble clic en el título). Al entrar se pide la `ADMIN_KEY`, que se recuerda mientras la pestaña esté abierta.
- El profesor cambia de fase con los botones **1. Uso · antes / 2. Uso · después / 3. Confianza · inicio / 4. Confianza · final**. La pregunta les cambia sola a los estudiantes en menos de 30 segundos, sin recargar.
- Arriba del tablero, un **contador** dice cuántos participantes respondieron la fase en curso ("3 de 4"), cuántos faltan y una barra de avance. Sirve para decidir cuándo cambiar de fase. El tablero se actualiza solo cada 15 segundos.
- Con **Comparar** elige qué fases muestra el gráfico, y con **👀 Mostrar a los estudiantes** hace que ellos vean esa misma comparación en su propio teléfono. Lo que se comparte son solo promedios, nunca nombres.
- La lista muestra las respuestas de cada participante y, cuando tiene las dos mediciones de un par, cuánto subió o bajó.
- El promedio de cada fase cuenta solo a quienes respondieron esa pregunta.
- Cada participante guarda una respuesta por fase, y al volver a una fase anterior ve la que ya había dado.
- Solo en la Fase 1 los estudiantes pueden borrar sus datos y volver a empezar.
- **Nueva dinámica:** vuelve a Fase 1 y borra las filas de la hoja `Respuestas` (deja la cabecera).
