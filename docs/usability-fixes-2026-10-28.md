# Correcciones de usabilidad — 28.10.2026

Later UI simplification: [YZ-025](progressive-disclosure-2026-10-28.md)
supersedes the stacked period layout described here and records the final
324-test workspace build. This report retains the earlier fix evidence.

Se corrigieron YZ-018–YZ-024 en el workspace local. Este pase complementa el
[smoke inicial](usability-smoke-2026-10-28.md), que conserva los fallos previos.
No se publicó un APK ni una OTA con estas correcciones.

## Comportamiento y evidencia

| ID | Cambio comprobado | Evidencia PNG/XML en `artifacts/usability-fixes-2026-10-28/` |
| --- | --- | --- |
| YZ-018 | Home y Review apilan Day/Week/Month; las tres opciones caben en 320 dp. Week y Month cambian el rango. | `01-home`, `02-week`, `03-month`, `59-review`, `60-review-week`, `61-review-month` |
| YZ-019 | Atrás cierra primero los menús, vuelve del detalle de Settings a su lista y después a la pestaña anterior. En las capturas principales de dinero/notas/tareas pide confirmar descarte; Keep editing conserva el borrador. | `07-draft-back`–`10-discard`, `36-snooze`–`39-settings-back`, `66-note-menu-back`, `72-task-form`–`74-task-discard`; pruebas de las capturas en `MainApp.usability.test.tsx` |
| YZ-020 | Data tools tiene una zona de estado/error fija fuera de las secciones. El error de JSON sigue visible al desplazar el formulario, sin abrir Export. No se ejecutó ninguna restauración. | `42-data`–`47-json-error` |
| YZ-021 | Add periodic operation activa Repeat y Save periodic operation; Add money entry sigue abriendo una operación única. | `23-final-form`, `29-periodic`, `30-periodic-form` |
| YZ-022 | App Time consulta Usage Access al montar y al recibir AppState active. El listener se elimina al salir; las respuestas antiguas no actualizan el estado de una consulta posterior. No hay sondeo. | `50-usage-denied`–`56-usage-resumed` |
| YZ-023 | Acciones conocidas de los botones compartidos, captura rápida y menú de notas usan iconos junto a etiquetas. Segmentos y chips seleccionados muestran una marca. Los acordiones Paper exponen expanded; Settings muestra 1 account, 1 list y el snooze 1 hour. | `04-capture`, `05-note`, `33-settings`, `36-snooze`, `65-note-actions`, `69-cancel-keyboard` |
| YZ-024 | Guardar/Cancelar de dinero tienen una fila propia fuera del scroll que sube con el teclado Android. Fecha/hora quedan en More entry details con el valor actual en el resumen. Los botones de añadir ocupan espacio propio fuera del contenido desplazable. | `17-ime-menu` reproduce la superposición antes del ajuste de teclado; `24-final-keyboard`–`26-save-keyboard`, `68-cancel-form`–`70-cancel-with-keyboard` comprueban el arreglo |

Las capturas `01`–`20` corresponden a una compilación intermedia; `21`–`56`
comprueban el ajuste del teclado y detalles de dinero. `57` en adelante usan el
APK final, que también ajusta el contraste de la marca de los chips. No se
cambió la geometría entre las dos últimas compilaciones.

## Validación reproducible

- Siete regresiones de código fallaron antes del cambio; después pasan las nueve
  pruebas de `src/app/MainApp.usability.test.tsx`, incluyendo menú anidado y fila
  de acciones fuera del scroll.
- Resultado final: **64 suites / 320 pruebas**, TypeScript y ESLint correctos.
  `jest-final.log` guarda el resultado completo. Una prueba antigua de focus
  dependía de que dos llamadas acabaran en milisegundos distintos; ahora usa
  un reloj de prueba explícito para inicio y fin. No se cambió esa regla del producto.
- Build `:app:assembleLocalTest -PreactNativeArchitectures=x86_64 --max-workers=2`
  correcto; véase `build-final.log`.
- APK final SHA-256:
  `8ecaf0f0469a903f568ad79cd1eabf075cc5492803e976d015abf7ee6b649acc`.
- Emulador `emulator-5556`, Android API 35, 960×1920 px y densidad 480:
  **320×640 dp**. Paquete `dev.yuzuha.localtest`, bundle incrustado 0.2.1.
- Recorrido nombrado: `artifacts/usability-fixes-2026-10-28/tests/usability.smoke.ts`.
  Usa el driver ADB de Joy; cada acción registra una captura PNG, XML y una línea
  en `journey.jsonl`. Ejemplo desde la raíz: `npx tsx artifacts/usability-fixes-2026-10-28/tests/usability.smoke.ts screen comprobacion`.
  Las acciones requieren `RUN_BLUESTACKS_SMOKE=1`.
- Se guardó un gasto Food de EUR 2,35 con teclado numérico completo visible;
  el total pasó de EUR 12,34 a EUR 14,69. Cancelar un borrador de EUR 9,99
  mantuvo dos entradas. La nota y tarea del smoke inicial siguieron presentes.
- Para comprobar permiso denegado se revocó únicamente GET_USAGE_STATS del
  paquete localTest mediante ADB; después se concedió por la UI de Android.
  Se verificó `package=dev.yuzuha.localtest` antes de tocar el interruptor.
- Gboard entraba inicialmente en modo escritura manual. Se desactivó
  temporalmente `stylus_handwriting_enabled` para probar el teclado completo;
  después se restauró el valor por defecto. `show_ime_with_hard_keyboard` ya
  tenía valor 1 y se conservó.

El logcat guardado del proceso final no contiene FATAL EXCEPTION ni errores
ReactNativeJS con el filtro empleado. Esto solo cubre ese proceso.

El registro exploratorio conserva tres expectativas que no coincidieron con
el texto/scroll observado: `03-month` buscaba October en lugar del rango de
fechas, `34-reminders` esperaba Snooze antes de desplazar la pantalla y
`65-note-actions` esperaba Edit note, aunque la edición se abre tocando la
nota. Las capturas y pasos posteriores verifican los estados reales; no se
presenta ese registro como una ejecución automática sin fallos.

## Límites

Este pase comprueba los hallazgos del smoke inicial y las rutas afectadas.
No equivale a una prueba exhaustiva de todas las funciones o combinaciones.
No se probó teléfono físico, iOS, TalkBack, fuentes grandes, rotación, todas
las paletas, restauraciones destructivas, entrega de recordatorios ni OTA.
El paquete de producción y el teléfono conectado no se modificaron.
No hay cambio de esquema, dependencias, versión, instalador ni proceso de fondo.

Publication update (28.10.2026): these UI changes are included in the verified
[0.3.0 native baseline](releases/v0.3.0.md). Earlier unpublished/intermediate
notes above retain their original test context. Latest delivery includes the
complete signed APK and 0.3 bundle, with both earlier bundle feeds preserved.
