/* Liga a distorção do vidro do menu suspenso (filtro SVG no backdrop-filter)
   só no Chrome/Edge, os únicos que desenham url() dentro do backdrop-filter;
   nos outros fica o vidro desfocado. */
(function () {
  var marcas = (navigator.userAgentData && navigator.userAgentData.brands) || [];
  var chromium = marcas.some(function (m) { return /Chromium/.test(m.brand); });
  if (chromium && window.CSS && CSS.supports('backdrop-filter', 'url(#a) blur(1px)')) {
    document.documentElement.classList.add('dd-liquido');
  }
})();
