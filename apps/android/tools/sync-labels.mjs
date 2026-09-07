// Reuse the product's five-language labels; native additions are maintained here.
import { MESSAGES } from '../../../public/i18n.js';
import fs from 'node:fs';
const additions = {
 'app_name':['TGN Live','TGN Live','TGN Live','TGN Live','TGN Live'],
 'native.settings':['设置','Settings','Réglages','Ajustes','الإعدادات'],
 'native.login':['浏览器登录','Sign in with browser','Connexion par navigateur','Entrar con navegador','الدخول عبر المتصفح'],
 'native.loginWaiting':['请在浏览器完成登录，然后返回应用','Complete browser sign-in, then return to the app','Terminez la connexion dans le navigateur, puis revenez','Completa el acceso en el navegador y vuelve','أكمل الدخول في المتصفح ثم عُد إلى التطبيق'],
 'native.cancel':['取消','Cancel','Annuler','Cancelar','إلغاء'],
 'native.logout':['退出登录并清除本机书卷缓存','Sign out and clear local story cache','Déconnexion et suppression du cache local','Salir y borrar la caché local','الخروج ومسح ذاكرة الحكايات المحلية'],
 'native.offline':['离线或登录已过期 · 缓存仅供阅读','Offline or sign-in expired · cached reading only','Hors ligne ou session expirée · cache en lecture seule','Sin conexión o sesión caducada · caché de solo lectura','دون اتصال أو انتهت الجلسة · قراءة النسخة المحفوظة فقط'],
 'native.reconcile':['先核对服务器存档，再决定是否重试','Check the server save before retrying','Vérifier la sauvegarde avant de réessayer','Verificar la partida antes de reintentar','تحقق من الحفظ على الخادم قبل المحاولة'],
 'native.busy':['此书仍在处理行动，请稍后重新核对','An action is still running. Check again shortly','Une action est en cours. Vérifiez à nouveau bientôt','Hay una acción en curso. Vuelve a comprobar en breve','هناك فعل قيد التنفيذ. تحقق مجددًا بعد قليل'],
 'native.responding':['世界正在回应……','The world is responding…','Le monde vous répond…','El mundo está respondiendo…','العالم يستجيب…'],
 'native.organizing':['正在整理这一页……','Organizing this page…','Mise en ordre de cette page…','Organizando esta página…','جارٍ ترتيب هذه الصفحة…'],
 'native.continuing':['正在续写……','Continuing the story…','La suite prend forme…','La historia continúa…','تتواصل الحكاية…'],
 'native.haptics':['触感反馈','Haptic feedback','Retour haptique','Respuesta háptica','استجابة لمسية'],
 'native.close':['关闭','Close','Fermer','Cerrar','إغلاق'],
 'native.updated':['更新于 {date}','Updated {date}','Mis à jour : {date}','Actualizado: {date}','آخر تحديث: {date}'],
 'native.empty':['暂无记录','Nothing recorded yet','Aucune entrée','Sin registros','لا سجلات بعد'],
 'native.growth':['新的力量已写入故事','New power is now part of your story','Un nouveau pouvoir entre dans votre histoire','Un nuevo poder forma parte de tu historia','أصبحت قوة جديدة جزءًا من حكايتك'],
 'native.export':['导出本机计时记录','Export local timing records','Exporter les mesures locales','Exportar tiempos locales','تصدير قياسات الوقت المحلية'],
 'native.timingNote':['可见帧为视口与后续帧观测，不是物理像素时间','Visible frames use viewport checks and later frames, not physical display timestamps','Visibilité estimée par la fenêtre et les images suivantes, pas par les pixels physiques','Visibilidad estimada por el área visible y fotogramas posteriores, no por píxeles físicos','الرؤية مقاسة ضمن النافذة والإطارات التالية وليست توقيت الشاشة المادي'],
 'native.account':['私人书库','Private library','Bibliothèque privée','Biblioteca privada','مكتبة خاصة'],
 'native.error':['连接未完成，请重新核对。草稿已保留。','Connection incomplete. Check again; your draft is kept.','Connexion interrompue. Vérifiez à nouveau ; le brouillon est conservé.','Conexión incompleta. Verifica de nuevo; el borrador se conserva.','لم يكتمل الاتصال. تحقق مجددًا؛ المسودة محفوظة.'],
 'native.contextChanged':['书卷已更新，这次行动尚未发送。请先读新内容，再决定下一步。','The story changed. This action was not sent. Read the update before your next move.','L’histoire a changé. Cette action n’a pas été envoyée. Lisez la suite avant de choisir.','La historia cambió. Esta acción no se envió. Lee la actualización antes de actuar.','تغيرت الحكاية ولم يُرسل هذا الفعل. اقرأ المستجدات قبل خطوتك التالية.'],
 'native.creationUnknown':['书卷可能已经创建。请先核对书架，避免重复立卷。','Your story may already exist. Check the library before creating another.','Votre histoire existe peut-être déjà. Vérifiez la bibliothèque avant de la recréer.','La historia puede haberse creado. Revisa la biblioteca antes de crear otra.','قد تكون الحكاية أُنشئت بالفعل. تحقق من المكتبة قبل إنشاء أخرى.'],
 'native.inspectShelf':['核对书架','Check library','Vérifier la bibliothèque','Revisar biblioteca','تحقق من المكتبة'],
 'native.creationReviewed':['已核对书架，允许重新创建','Library checked; allow a new creation','Bibliothèque vérifiée ; autoriser une nouvelle création','Biblioteca revisada; permitir otra creación','راجعت المكتبة؛ السماح بإنشاء جديد'],
 'native.choiceEdit':['点选后可编辑全文','Tap to edit the full action','Touchez pour modifier le texte complet','Toca para editar la acción completa','اضغط لتحرير الفعل كاملًا'],
 'native.font0':['很小','Very small','Très petit','Muy pequeña','صغير جدًا'],
 'native.font1':['小','Small','Petit','Pequeña','صغير'],
 'native.font2':['标准','Default','Standard','Predeterminada','افتراضي'],
 'native.font3':['大','Large','Grand','Grande','كبير'],
 'native.font4':['很大','Very large','Très grand','Muy grande','كبير جدًا'],
};
const encode = key => key.replaceAll('.', '_').replace(/[^a-z0-9_]/g, c => `u${c.codePointAt(0).toString(16)}`);
const xml = s => '"' + s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','\\"').replaceAll("'","\\'").replaceAll('\n','\\n') + '"';
for (const [i, lang] of ['zh','en','fr','es','ar'].entries()) {
 const dir = new URL(`../app/src/main/res/${lang === 'zh' ? 'values' : `values-${lang}`}/`, import.meta.url);
 fs.mkdirSync(dir,{recursive:true});
 const labels = {...MESSAGES[lang], ...Object.fromEntries(Object.entries(additions).map(([k,v])=>[k,v[i]]))};
 fs.writeFileSync(new URL('strings.xml',dir), '<resources>\n'+Object.entries(labels).map(([k,v])=>`  <string name="${encode(k)}" formatted="false">${xml(v)}</string>`).join('\n')+'\n</resources>\n');
}
