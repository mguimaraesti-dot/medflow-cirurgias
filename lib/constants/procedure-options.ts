// Listas sugeridas para o cadastro de Procedimentos. São sugestões, não
// um enum fechado no banco — o formulário sempre permite digitar um
// valor diferente ("Outro") quando a lista não cobre o caso.

export const PROCEDURE_SPECIALTIES = [
  "Gastroenterologia",
  "Endoscopia Digestiva",
  "Colonoscopia",
  "Endoscopia Terapêutica",
  "Ecoendoscopia",
  "Endoscopia Pancreatobiliar",
] as const;

export const ANATOMICAL_REGIONS = [
  "Esôfago",
  "Estômago",
  "Duodeno",
  "Intestino delgado",
  "Cólon",
  "Reto e ânus",
  "Vias biliares",
  "Pâncreas",
  "Fígado",
  "Abdome (geral)",
] as const;

export const PROCEDURE_LOCATIONS = [
  "Consultório",
  "Ambulatório",
  "Centro cirúrgico",
  "Hospital-dia",
  "Internação hospitalar",
] as const;

export const CLASSIFICATION_OPTIONS = [
  { value: "diagnostico", label: "Diagnóstico" },
  { value: "terapeutico", label: "Terapêutico" },
  { value: "ambos", label: "Diagnóstico e terapêutico" },
] as const;

export const PROCEDURE_TYPE_OPTIONS = [
  { value: "endoscopico", label: "Endoscópico" },
  { value: "cirurgico", label: "Cirúrgico" },
] as const;
