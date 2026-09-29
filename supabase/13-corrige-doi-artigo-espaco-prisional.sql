-- 28/09/2026: DOI do artigo do espaço prisional estava com "SisPri" (faltava o "s");
-- o link "Ver em ReJuB" dava 404. DOI certo conferido na Crossref, abre o artigo na revista da ENFAM.
update public.artigos
set doi = '10.54795/rejubespecial.sispris.202',
    publicacao_url = 'https://doi.org/10.54795/rejubespecial.sispris.202'
where doi = '10.54795/RejuBespecial.SisPri.202'
returning slug, doi, publicacao_url;
