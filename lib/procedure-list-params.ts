export const PROCEDURE_PAGE_SIZES = [10, 25, 50] as const;
export const PROCEDURE_SORT_KEYS = ["name", "code", "tuss", "specialty", "location", "materials", "status"] as const;
export type ProcedureSortKey = (typeof PROCEDURE_SORT_KEYS)[number];

export type ProcedureListParams = {
  q: string;
  specialty?: string;
  status?: "active" | "inactive";
  location?: string;
  sort: ProcedureSortKey;
  dir: "asc" | "desc";
  page: number;
  size: number;
};

type Raw = Record<string, string | string[] | undefined>;

function one(raw: Raw, key: string): string | undefined {
  const v = raw[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() ? s.trim() : undefined;
}

export function parseProcedureListParams(raw: Raw): ProcedureListParams {
  const status = one(raw, "status");
  const sort = one(raw, "sort");
  const size = Number(one(raw, "size"));
  const page = Number(one(raw, "page"));
  return {
    q: one(raw, "q") ?? "",
    specialty: one(raw, "specialty"),
    status: status === "active" || status === "inactive" ? status : undefined,
    location: one(raw, "location"),
    sort: (PROCEDURE_SORT_KEYS as readonly string[]).includes(sort ?? "") ? (sort as ProcedureSortKey) : "name",
    dir: one(raw, "dir") === "desc" ? "desc" : "asc",
    size: (PROCEDURE_PAGE_SIZES as readonly number[]).includes(size) ? size : 10,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Querystring só com o que difere do padrão. */
export function procedureListQuery(p: ProcedureListParams, overrides: Partial<ProcedureListParams> = {}) {
  const v = { ...p, ...overrides };
  const qs = new URLSearchParams();
  if (v.q) qs.set("q", v.q);
  if (v.specialty) qs.set("specialty", v.specialty);
  if (v.status) qs.set("status", v.status);
  if (v.location) qs.set("location", v.location);
  if (v.sort !== "name") qs.set("sort", v.sort);
  if (v.sort !== "name" || v.dir !== "asc") qs.set("dir", v.dir);
  if (v.size !== 10) qs.set("size", String(v.size));
  if (v.page > 1) qs.set("page", String(v.page));
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export function procedureActiveFilterCount(p: ProcedureListParams) {
  return [p.q, p.specialty, p.status, p.location].filter(Boolean).length;
}
