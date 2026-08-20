'use strict';
const fs = require('fs');
const F = 'C:/Users/katia/tmarea-backend/_bitacoras/plan_de_cierre_2026-08-20/plan_de_cierre_2026-08-20.txt';
let t = fs.readFileSync(F, 'utf8');
const antes = t.length;

// --- (1) la afirmacion que quedo falsa --------------------------------------
const a1 = '  DEFECTO DE INSTRUMENTO: NINGUNO EN ESTA ESCRITURA. Se dice porque el\n' +
  '  declarativo lleva doce fichados y la ausencia tambien es dato. El instrumento\n' +
  '  se escribio como FICHERO y no como node -e inline, que es la regla que este\n' +
  '  repositorio ya pago; se corrio una vez; y se comprobo que los ficheros\n' +
  '  existen despues de correrlo, que es la otra regla que costo un commit malo.\n';
const b1 = '  DEFECTO DE INSTRUMENTO: ~~NINGUNO EN ESTA ESCRITURA~~ TRES, Y VAN EN EL\n' +
  '  APARTADO 11. El parrafo decia, y se conserva tachado porque llego a\n' +
  '  commitearse asi en 5b9cb2e: «NINGUNO EN ESTA ESCRITURA. Se dice porque el\n' +
  '  declarativo lleva doce fichados y la ausencia tambien es dato.» Era cierto\n' +
  '  cuando se escribio -- cubria la escritura de las filas -- y dejo de serlo en\n' +
  '  cuanto corrio la verificacion de push, que es parte de la misma sesion.\n' +
  '  Lo que SI se sostiene de aquel parrafo, y por eso no se borra entero: el\n' +
  '  instrumento se escribio como FICHERO y no como node -e inline, que es la\n' +
  '  regla que este repositorio ya pago; se corrio una vez; y se comprobo que los\n' +
  '  ficheros existen despues de correrlo, que es la otra regla que costo un\n' +
  '  commit malo. Los tres defectos son de OTROS instrumentos de la misma sesion.\n';
if (!t.includes(a1)) { console.error('ALTO: ancla 1'); process.exit(1); }
t = t.replace(a1, b1);

// --- (2) el apartado 11 -----------------------------------------------------
const b2 = `

------------------------------------------------------------------------------
11 . TRES DEFECTOS DE INSTRUMENTO, DECLARADOS PORQUE LOS TRES LLEGARON A CORRER
------------------------------------------------------------------------------
Los tres fallaron RUIDOSO y NINGUNO llego al dato: el declarativo, el commit y
el objeto remoto son correctos y quedaron verificados. Lo que estos tres tocan
es la confianza en los CONTROLES, que es lo que este repositorio lleva doce
defectos aprendiendo a no regalar.

Van los tres al arbol por una razon que esta escrita en este mismo documento:
la fila SESION-plan-de-cierre-2026-08-20::un-entregable-que-solo-vive-en-el-chat-no-existe.
Dos de los tres estaban declarados unicamente en los comentarios de
06_verificar_push.js, que NO se trackea. Declarar un hallazgo en un fichero sin
trackear es el mismo defecto que ese hallazgo denuncia.


D1 · BACKTICK DENTRO DE UN String.raw — la familia ya fichada, otra vez
     instrumento: 02_enmendar_bitacora.js
     Traia dos backticks DENTRO del template, alrededor de los nombres de campo
     «sostiene» y «depende_de». El backtick cerro el template y el fichero no
     parseo: SyntaxError: Unexpected identifier 'sostiene'.
     COMO FALLO: antes de abrir el fichero de destino. No escribio nada.
     COMO SE ARREGLO: comillas angulares, y un conteo que comprueba que dentro
     del bloque quedan exactamente DOS backticks: apertura y cierre.
     YA ESTABA DECLARADO en el mensaje de 5b9cb2e.
     Y VOLVIO A MORDER EN LA MISMA SESION, en el shell y no en node: un intento
     de editar la memoria con node -e dentro de comillas dobles perdio TRES
     tokens entre backticks, que el shell tomo por sustitucion de comando. La
     leccion se corrige de raiz y no por caso: para texto con backticks NO se
     usa node -e; se usa un fichero, o la edicion por cadena exacta.


D2 · UNA REGEX SIN ANCLAR LEYO EL BLOQUE EQUIVOCADO — rojo sobre un dato bueno
     instrumento: 06_verificar_push.js, PARTE B
     Las tres regex que extraen filas/unicas/vivas del MENSAJE no estaban
     ancladas al bloque AHORA. Con el flag /m y primera coincidencia agarraron
     el bloque ANTES: leyeron 68 / 66 / 61 y los compararon contra 72 / 70 / 64
     del objeto remoto. TRES comprobaciones en MAL sobre un mensaje correcto.
     POR QUE EL MENSAJE TENIA LOS DOS BLOQUES: porque el declarativo lo exige.
     Su politica de conteo dice que las dos cifras van siempre juntas, asi que
     todo mensaje de esta familia publica ANTES y AHORA. El control se comio la
     convencion del propio dato que estaba verificando.
     COMO SE ARREGLO: se acota el texto al bloque AHORA antes de buscar, y se
     agrega CONTROL POSITIVO DEL ANCLAJE: el bloque ANTES tiene que existir y
     tiene que dar un numero DISTINTO. Si diera lo mismo, el anclaje no estaria
     probando nada. Da ANTES 61 vs AHORA 64.
     LA FORMA: es la de siempre en este repositorio -- corre perfecto y mide
     otra cosa -- con una vuelta mas: aca la victima no fue el dato sino el
     VEREDICTO. Un rojo falso cuesta lo mismo que un verde falso el dia que
     alguien decida creerle.


D3 · UNA COMPARACION LITERAL CONTRA UN TEXTO PARTIDO EN DOS LINEAS
     instrumento: 06_verificar_push.js, control de la politica de la cifra
     ESTE ES EL QUE VALE, Y NO ES SOLO MIO.
     El control comprobaba la politica del owner sobre como se publica la cifra
     de §2 -- forma legal «4 de 15, con 2 anuladas por decision del owner»,
     forma pelada PROHIBIDA -- con un includes() literal. En el mensaje del
     commit esa frase cae en el corte de linea:

         ...NO SE MOVIO: sigue en 4 de 15, con 2 anuladas por
         decision del owner. Ninguna de estas cuatro filas...

     La salvedad estaba ENTERA. El control no la vio, y salio rojo POR LAS DOS
     PUNTAS: no encontro la forma legal, y como no la encontro tampoco pudo
     retirarla del texto, asi que declaro que el mensaje publicaba la forma
     PROHIBIDA. Un control que acusa de violar una politica a un texto que la
     cumple.

     LO QUE ESTO LE DICE A UNA FILA QUE YA EXISTE, y es el motivo por el que
     este defecto va al arbol y no muere con la sesion:

       D4D5::la-cifra-tiene-emisor-pero-no-tiene-guardia pide exactamente un
       guardia de esta forma. Su propio costo_estimado lo dice: «Bajo si alcanza
       con un control que barra los .md y las bitacoras buscando el patron
       "N de 15" sin su salvedad».

       ESE GUARDIA, ESCRITO ASI, NACE ROTO. Un barrido literal de «N de 15» sin
       su salvedad convierte en FALSO POSITIVO toda cita que caiga en un corte
       de linea -- y en prosa a 78 columnas, que es la convencion de este
       repositorio, eso pasa seguido. El guardia tiene que NORMALIZAR EL ESPACIO
       EN BLANCO antes de comparar.

       Queda MEDIDO ANTES de que el guardia se escriba, que es la unica vez que
       una medicion asi sale barata.

     Y NO ES LA PRIMERA APARICION DEL PATRON, medido: el verificador de la
     sesion anterior, _bitacoras/tres_de_d4_2026-08-20/20_verificar_push_dos_repos.js,
     hace la misma comparacion literal en TRES sitios -- dos contra el mensaje y
     uno contra el texto del PLAN. No mordio porque en aquel commit la frase no
     cayo en el corte. Ese fichero NO esta trackeado, asi que su version del
     defecto se habria ido con su sesion.
     CONTROL, para no acusar de mas: el verificador reusable que SI esta
     trackeado -- _bitacoras/spec2_pantalla_2026-08-20/12_verificar_push.js --
     NO tiene control de la cifra, asi que no arrastra el defecto. Y el emisor
     tracked, scripts/publicar_cifra_spec2.js, tampoco: no barre nada, y lo dice
     de si mismo -- «no hay gancho que impida a una persona escribir la forma
     pelada a mano en otro documento».

     COMO SE ARREGLO: se normaliza el espacio en blanco del mensaje antes de
     comparar, y se agrega CONTROL NEGATIVO DEL PROPIO CRITERIO -- un texto
     fabricado con la forma pelada TIENE que ser cazado --, porque un control de
     esta clase pasa igual de bien por estar bien escrito que por no mirar.

     Despues del arreglo: 45 comprobaciones, 45 en verde, 0 en MAL.


LO QUE LOS TRES TIENEN EN COMUN, y no es la causa tecnica
------------------------------------------------------------------------------
Ninguno de los tres lo habria cazado un validador de forma, y los tres se
cazaron corriendo el instrumento y MIRANDO LA SALIDA. D1 por un error de
sintaxis, D2 y D3 por un rojo que no cerraba con lo que el dato decia.
La regla que este repositorio ya tiene escrita cubre los tres sin cambiarle una
palabra: un instrumento no se da por bueno porque compila -- se corre. A lo que
esta sesion le agrega una linea: y cuando sale ROJO, antes de tocar el dato hay
que preguntarse si el que se equivoco fue el control.

QUE NO SE TOCO EN ESTA ENMIENDA
  Nada mas. Ni una fila del declarativo, ni el validador, ni PLAN_JURISDICCION.md,
  ni src/ de ninguno de los dos repos. Los dos intocables siguen ' M' y sin
  stagear. La cifra de §2 no se movio y el conteo del declarativo tampoco:
  siguen 72 filas · 70 unicas · 64 VIVAS · 20 sitios · 11 barridos · 9 SIN BARRER.
`;
t = t + b2;

fs.writeFileSync(F, t, 'utf8');
console.log('ENMENDADA. bytes ' + antes + ' -> ' + t.length);
console.log('existe: ' + fs.existsSync(F));
for (const tok of ['11 . TRES DEFECTOS DE INSTRUMENTO', 'D1 · BACKTICK', 'D2 · UNA REGEX SIN ANCLAR',
                   'D3 · UNA COMPARACION LITERAL', 'ESE GUARDIA, ESCRITO ASI, NACE ROTO',
                   'NORMALIZAR EL ESPACIO', '20_verificar_push_dos_repos.js',
                   '~~NINGUNO EN ESTA ESCRITURA~~', '45 comprobaciones, 45 en verde']) {
  console.log((t.includes(tok) ? '  ok   ' : '  FALTA') + '  ' + tok);
}
