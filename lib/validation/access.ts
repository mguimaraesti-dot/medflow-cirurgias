import { z } from "zod";

const optionalText = z.preprocess(
  (v) => (v === null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional()
);

export const roleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe um nome pra função.")
    .max(60, "Nome muito longo."),
  description: optionalText,
});

export const changeRoleSchema = z.object({
  user_id: z.string().uuid(),
  role_id: z.string().uuid("Selecione uma função."),
});
