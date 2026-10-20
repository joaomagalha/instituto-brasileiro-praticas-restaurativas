// 16/10/2026: no celular, palavra com hífen ("saber-fazer", "compreendê-la")
// quebrava no hífen. Envolve cada uma num span que não quebra; o texto do CMS
// não muda, é só na tela.
(function () {
  var frases = document.querySelectorAll('.citacao-cartao blockquote');
  Array.prototype.forEach.call(frases, function (bq) {
    var nos = [], w = document.createTreeWalker(bq, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) if (/\S-\S/.test(w.currentNode.nodeValue)) nos.push(w.currentNode);
    nos.forEach(function (no) {
      var partes = no.nodeValue.split(/(\S*\S-\S\S*)/), frag = document.createDocumentFragment();
      partes.forEach(function (p, i) {
        if (!p) return;
        if (i % 2) { var s = document.createElement('span'); s.className = 'sem-quebra'; s.textContent = p; frag.appendChild(s); }
        else frag.appendChild(document.createTextNode(p));
      });
      no.parentNode.replaceChild(frag, no);
    });
    // As duas últimas palavras andam juntas: nunca uma palavra sozinha na
    // última linha. Na Home o motion.js já quebrou a frase em .palavra.
    var pal = bq.querySelectorAll('.palavra');
    if (pal.length > 1) {
      var a = pal[pal.length - 2], z = pal[pal.length - 1], cola = document.createElement('span');
      cola.className = 'sem-quebra'; a.parentNode.insertBefore(cola, a);
      while (cola.nextSibling && cola.nextSibling !== z) cola.appendChild(cola.nextSibling);
      cola.appendChild(z);
    } else if (bq.lastElementChild && bq.lastElementChild.className === 'sem-quebra' && !(bq.lastElementChild.nextSibling && bq.lastElementChild.nextSibling.nodeType === 3 && bq.lastElementChild.nextSibling.nodeValue.trim())) {
      // última palavra é hifenizada (já num span): puxa a anterior pra dentro dele
      var ult = bq.lastElementChild, ant = ult.previousSibling;
      if (ant && ant.nodeType === 3) {
        var m = ant.nodeValue.match(/(\S+\s+)$/);
        if (m) { ant.nodeValue = ant.nodeValue.slice(0, -m[1].length); ult.insertBefore(document.createTextNode(m[1]), ult.firstChild); }
      }
    } else {
      var t = [], w2 = document.createTreeWalker(bq, NodeFilter.SHOW_TEXT);
      while (w2.nextNode()) if (w2.currentNode.nodeValue.trim()) t.push(w2.currentNode);
      for (var k = t.length - 1; k >= 0; k--) {
        var v = t[k].nodeValue.replace(/\s+$/, ''), i = v.lastIndexOf(' ');
        if (i > 0) { t[k].nodeValue = v.slice(0, i) + '\u00a0' + v.slice(i + 1) + t[k].nodeValue.slice(v.length); break; }
      }
    }
  });
})();
