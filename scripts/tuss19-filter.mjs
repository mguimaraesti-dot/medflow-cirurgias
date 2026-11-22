// Quais materiais da TUSS 19 entram na cópia local.
//
// A tabela completa tem ~1,5 milhão de itens (~0,8 GB no banco) e não cabe no
// plano gratuito do Supabase (500 MB). Por isso a cópia padrão traz só os
// materiais de ENDOSCOPIA DIGESTIVA (papilótomo, fio guia, alça, balões,
// próteses/stents, clipes, pinças, etc.).
//
// Para incluir outras áreas, acrescente termos abaixo e rode o script de novo
// (a importação é segura de repetir). Os termos são comparados SEM acento e em
// minúsculas. Com o plano Pro do Supabase, use `--all` para importar tudo.
export const TUSS19_PATTERN = new RegExp(
  [
    "papilotomo",
    "esfincterotomo",
    "fio[ -]guia",
    "\\balca\\b",
    "balao (extrator|dilatador|de dilatacao|para dilatacao|esfincteroplastia|hidrostatico)",
    "cesta",
    "protese (biliar|pancreatica|plastica|metalica|esofagica|duodenal|enteral|colonica)",
    "stent (biliar|esofag|duoden|pancre|colon|enteral|metalico)",
    "clipe",
    "hemoclip",
    "\\bclip\\b",
    "pinca (de )?(biopsia|endoscop|corpo estranho|preensao|jacare|polipectomia)",
    "extrator",
    "injetor",
    "ligadura elastica",
    "ligador",
    "escova",
    "coagulador",
    "argonio",
    "drenagem naso",
    "dreno nasobiliar",
    "litotriptor",
    "colangioscop",
    "escleroterapia",
    "polipectomia",
    "mucosectomia",
    "dissecc",
    "endoscop",
  ].join("|")
);
