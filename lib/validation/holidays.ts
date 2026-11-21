import { z } from "zod";

const optionalText = z.preprocess(
  (v) => (v === null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional()
);

export const holidaySchema = z.object({
  name: z.string().min(1, "Informe o nome do feriado."),
  date: z.string().min(1, "Informe a data."),
  scope: z.enum(["national", "state", "municipal"]),
  state: optionalText,
  city: optionalText,
  is_facultative: z.preprocess((v) => v === "on" || v === true, z.boolean()).default(false),
  description: optionalText,
});

export type HolidayFormInput = z.infer<typeof holidaySchema>;
