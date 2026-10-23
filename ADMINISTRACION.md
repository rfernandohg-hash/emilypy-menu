# Emily Py

Catálogo: https://emilypy.pages.dev/

Panel: https://emilypy.pages.dev/admin/

El panel usa dos cuentas personales con contraseña: rfernandohg@gmail.com y deisyveraguarani@gmail.com. Configurar INVITE_FERNANDO e INVITE_DEISY como secretos aleatorios de al menos 32 bytes en Pages. Cada invitación permite activar una cuenta una sola vez. La URL de activación usa /admin/login.html#email=CORREO&invite=SECRETO. Compartir cada enlace solo con su destinatario. Cada persona debe elegir su propia contraseña (12 a 128 caracteres). No hay envío automático de correos.

Las contraseñas se derivan con PBKDF2-SHA256, sal aleatoria e iteraciones 100000. Sesiones de 12 horas en cookies Secure/HttpOnly/SameSite=Strict; tokens guardados como hash. Se limitan los intentos de acceso y se comprueba el origen de las escrituras. Para recuperación de cuenta, el propietario debe gestionar la cuenta desde D1 y generar una nueva invitación; no existe recuperación automática.

Datos y fotografías se guardan en D1, binding CATALOG_DB. El catálogo inicial conserva los 74 productos originales; las modificaciones se superponen por código y persisten entre despliegues. Las imágenes subidas se comprimen en el navegador y se guardan en la base. No se elimina información: ocultar un producto lo retira del catálogo. El panel ofrece respaldo JSON de productos e información; las fotos se conservan en D1 y sus referencias figuran en el respaldo.

Los guardados usan versiones: si dos personas modifican el mismo producto, la segunda debe recargar antes de guardar para no sobrescribir cambios ajenos.

Build: `node build.mjs`, salida `dist`. Tests: `node --test tests/api.test.mjs`. No publicar scripts de desarrollo ni Functions dentro de dist. Las imágenes originales permanecen en fotos/ e imagenes/.

Los plazos, condiciones de entrega y testimonios deben ser reales y completados por los administradores. Los precios originales se mantienen como referenciales. Pedir por WhatsApp abre un mensaje editable; no envía el pedido automáticamente.
