# Smoke de facilidad de uso — 28.10.2026

> Seguimiento: [correcciones y nueva verificación](usability-fixes-2026-10-28.md).
> Este informe conserva el comportamiento anterior a las correcciones.

Resultado: los recorridos básicos funcionan, pero la revisión de facilidad de
uso no pasa. Hay controles fuera de pantalla, una salida inesperada con Atrás
y mensajes de error ocultos. Esta pasada registra problemas; no los corrige.

## Entorno y evidencia

- Código del workspace con cambios previos sin commit; versión 0.2.1. HEAD de
  referencia: `1ecb626e241417146931df9f5d1e76828bbbc877`. No es una prueba de ese
  commit limpio ni de una release publicada.
- Android API 35, AVD `Medium_Phone_API_35`, serial `emulator-5556`.
- 320 × 640 dp; 960 × 1920 píxeles, densidad 480 dpi.
- APK `dev.yuzuha.localtest`, compilado en esta pasada con Java 17,
  `:app:assembleLocalTest -PreactNativeArchitectures=x86_64 --max-workers=2`.
  Build correcto. Bundle embebido 0.2.1, motivo `LOCAL_BUNDLE_ONLY`.
- SHA-256 del APK: `654158cdb3ec1936f6b1397d5f7817196e315e4ba3bb8ae5f7ef1f613aafb837`.
- `npm ci` completado; `npm test`: 63 suites / 311 pruebas correctas.
  `npm run typecheck`: correcto. No se ejecutó lint en esta pasada.
- Capturas PNG, jerarquías XML, `journey.jsonl`, driver y logcat local:
  `artifacts/usability-smoke-2026-10-28/` (directorio ignorado por Git).
- Se empleó la skill `joy-automate`: copia sin cambios de `AdbDriver` de Joy y
  recorrido con nombre `tests/usability.smoke.ts`. Los toques parten de las
  etiquetas y coordenadas observadas en el XML anterior. Las acciones requieren
  `RUN_BLUESTACKS_SMOKE=1`. El check de paquete se adaptó a Yuzuha porque el
  comando de Joy comprueba otro producto.
- El Xiaomi conectado y la app de producción no se instalaron, borraron ni
  manipularon. Los registros de prueba quedan en el paquete localTest.

El registro conserva también intentos fallidos por etiquetas esperadas
incorrectas, mayúsculas, animación o falta de desplazamiento. No todos esos
intentos representan fallos de producto. Las afirmaciones de este informe se
apoyan en los estados concretos que se indican abajo y en la implementación.

Se guardaron 187 capturas PNG. `tests/evidence.regressions.ts` comprueba los
estados XML capturados de YZ-018–YZ-022: las cinco comprobaciones fallan y
producen `regression-results.json`. Es una comprobación de esta evidencia
estática, no una nueva ejecución en vivo ni una prueba de regresión de código.
`git diff --check` pasó al cerrar la documentación.

## Hallazgos prioritarios

| ID | Prioridad | Observado y efecto | Evidencia / criterio pendiente |
| --- | --- | --- | --- |
| YZ-018 | Alta | Inicio y Review desbordan horizontalmente el selector de período. Day ocupa 288 dp; Week solo deja una franja de 8 dp y Month no está en el XML visible. Cambiar a Month falla. | `03-home`, `04-home-week`, `132-review`. Las tres opciones deben verse y poder seleccionarse a 320 dp. App Time usa otra disposición y sí permite ver los tres períodos. |
| YZ-019 | Alta | Atrás de Android desde Settings y desde el menú de snooze abre el lanzador. Volver a abrir inicia Overview; no vuelve al contexto anterior. Con un borrador de nota sin guardar también se pierde el texto. | `11-settings-dark` → `12-android-back`, `40-snooze-menu` → `41-close-snooze`, `96-note-body` → `97-note-keyboard-hidden`. Las flechas internas sí vuelven. Definir cierre de menú, pantalla secundaria y borrador antes de corregir. En el caso del borrador no había teclado software visible. |
| YZ-020 | Alta | Restaurar JSON inválido no muestra el error junto al formulario. El error común de Data tools está dentro de Export and backup; con esa sección cerrada queda oculto. | `144-json-invalid`, `155-json-preview-position`, `156-json-preview-again`, `158-export-open`, `159-error-under-export`: el mismo error aparece al abrir Export. Debe verse en la operación que lo produce sin abrir otra sección. |
| YZ-021 | Media | Periodic money → Add periodic operation abre New entry con Repeat desactivado y Save entry. El usuario debe encontrar y activar Repeat para llegar a Save periodic operation. | `84-periodic`, `85-periodic-add`, `86-repeat-position`, `87-repeat-enabled`, `88-repeat-options`. El acceso periódico debe preparar una operación periódica; el acceso normal debe seguir siendo de una sola vez. |
| YZ-022 | Media | Tras conceder Usage Access en Android, al volver la app sigue mostrando Usage Access is off. Requiere Check permission again para reconocerlo. | `168-usage-localtest` muestra versión 0.2.1; `170-usage-list` muestra Allowed; `171-app-time-return` sigue off; `172-permission-recheck` muestra el informe. Actualizar el estado al volver del sistema, sin polling. |
| YZ-023 | Media | Muchas acciones no tienen icono: Save, Cancel, controles de fecha, acciones de captura y acciones de menús de notas. Algunas selecciones dependen sobre todo del color. La iconografía es desigual. | `49-money-form`, `94-note-form`, `104-note-menu`, `113-task-form`, `188-quick-capture`; `PrimaryButton`, `TextButton`, `MenuActions`, `SegmentButton` y `ChipButton`. Adoptar un vocabulario pequeño de iconos con texto; comprobar selección y expansión sin depender solo del color. Es una mejora de reconocimiento, no una avería del sistema de fuentes: navegación y Settings sí muestran iconos. |
| YZ-024 | Media | Una captura básica de dinero exige desplazarse hasta Save/Cancel incluso sin abrir los detalles opcionales. Expandir repetición alarga más el recorrido. El botón flotante también puede cubrir parte de los filtros o contenido. | `49-money-form`, `50-money-form-bottom`, `60-money-filters`, `89-repeat-daily`. Validar una captura rápida con teclado software y 320 dp; ninguna acción debe tapar un control necesario. |

Detalles menores observados: Settings muestra `1 accounts` y `1 lists`;
el menú de snooze muestra `1 hours`. Se pueden incluir en el trabajo de textos
y señales de estado, sin confundirlos con bloqueos funcionales.

## Cobertura ejecutada

| Área | Resultado y alcance real |
| --- | --- |
| Arranque / navegación | Arranque local y relanzado correctos. Home, Money, Notes, Tasks, App Time, Settings, Search, Review y Data tools visitados. Fallos de período y Atrás indicados arriba. |
| Captura rápida | Menú Home con Add money/note/task visible. Add task abre el formulario; Cancel devuelve a Tasks sin crear un segundo registro (`188`–`190`). |
| Dinero | Importe vacío produce error claro (`51`). Calendario abre y Cancel mantiene el valor (`52`–`53`). Gasto Food de EUR 12.34 guardado (`58`) y persistente tras force-stop (`184`). Filtros All/Custom y fechas límite visibles; informe Month/Year muestra EUR 12.34. |
| Herramientas de dinero | Report, Budgets, Transfer, Split entry, Periodic money y Account balances abiertos. Transfer explica que falta una segunda cuenta (`78`). Cuenta Everyday muestra -EUR 12.34 (`185`). Repeat/Day muestra los siete días (`89`–`90`). No se crearon presupuestos, transferencias, splits ni reglas periódicas. |
| Notas | Se creó UsabilitySmoke2810 con cuerpo. Guardar, fijar, archivar, vista Archived y restaurar funcionaron (`103`–`111`). La búsqueda global abre el editor y Cancel vuelve a notas (`127`–`129`). Nota persistente tras reinicio (`182`). |
| Tareas | Se creó UsabilityTask2810 con fecha de hoy elegida en el diálogo nativo (`114`–`119`). Completar actualiza el contador; Completed permite reabrir (`120`–`123`). Persiste tras reinicio (`183`). |
| Búsqueda / Review | Búsqueda Usability devuelve nota y tarea; abrir nota llega al editor (`127`–`128`). Review muestra gasto y tarea del día (`132`), con el selector desbordado. |
| Settings | Siete categorías visitadas. Appearance admite Dark y Ocean y vuelve a la lista (`08`–`11`). General, Money y App time muestran sus controles. Task organization abre Dependencies, Projects, Templates, Lists y Recurring tasks (`22`–`33`). Task reminders y menú de snooze visitados (`38`–`40`). Code updates abre el botón de comprobación (`45`), sin ejecutarlo. |
| Data tools | Inicio con cinco secciones cerradas (`135`). Export abierto; Restore JSON abierto y probado con not-json. DocumentsUI abre y cancelar vuelve al formulario (`160`–`161`). No se confirmó restauración ni borrado. Restore encrypted y Delete local data solo se inspeccionaron como accesos cerrados; no se validaron sus operaciones. |
| App Time / enfoque | Se concedió Usage Access por la interfaz de Android al paquete 0.2.1; recheck y lectura manual devolvieron 4 registros y 26 min (`168`–`173`). Analysis muestra media, apps, cuota, día y No data anterior (`176`). Una sesión de enfoque inicia y termina (`179`–`180`). Los snapshots sobreviven al relanzado (`181`). |

El logcat del proceso final no contiene coincidencias de FATAL EXCEPTION ni
errores ReactNativeJS en el filtro empleado. Esto solo cubre ese proceso final;
no equivale a una auditoría completa de todos los procesos durante la sesión.

## Límites y siguiente validación

Esto es un smoke en emulador y una revisión experta, no un estudio con usuarios
ni una regresión completa de todas las combinaciones de datos. No se probó iOS,
el teléfono físico, TalkBack, todas las paletas, letras grandes, rotación,
teclado software visible, adjuntos, entrega de recordatorios, widgets, compartir,
instalación/OTA, backup cifrado completo ni restauraciones destructivas.

La evidencia de datos guardados cubre un gasto, una nota y una tarea, no datos
masivos. La sesión de enfoque completa se vio antes de relanzar; no se volvió a
abrir su historial después del reinicio.

Primero corregir YZ-018, YZ-019 y YZ-020 con pruebas de regresión que fallen
antes del cambio. Después atender los accesos periódicos, el retorno del permiso,
la captura de dinero y los iconos. Repetir el recorrido con teclado software,
320 dp, tamaño habitual y accesibilidad antes de declarar el pase resuelto.
