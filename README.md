# cercanIA
Medición de la CercanIA con la IA

Los asistentes a una charla marcan en un dial qué tan cerca se sienten de la IA, antes (Fase 1) y después (Fase 2). El profesor ve los resultados en un tablero.

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

- **Estudiantes:** abren `https://<usuario>.github.io/cercanIA/`.
- **Profesor:** `https://<usuario>.github.io/cercanIA/?view=admin` (o doble clic en el título). Para cambiar de fase se pide la `ADMIN_KEY`.
- En Fase 2 los estudiantes ya no pueden borrar sus datos.
- **Nueva dinámica:** vuelve a Fase 1 y borra las filas de la hoja `Respuestas` (deja la cabecera).
