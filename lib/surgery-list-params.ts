import { isSituation, type SurgerySituation } from "@/lib/surgery-situation";

export const PAGE_SIZES = [10, 25, 50] as const;
export const SORT_KEYS = [
  "created",
  "code",
  "patient",
  "hospital",
  "procedure",
  "indication_date",
  "expected_date",
  "confirmed_date",
  "status",
] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export type SurgeryListParams = {
  q: string;
  status?: SurgerySituation;
  hospital?: string;
  attendance?: "particular" | "convenio";
  priority?: "low" | "normal" | "high" | "urgent";
  requestFrom?: string;
  requestTo?: string;
  expectedFrom?: string;
  expectedTo?: string;
  sort: SortKey;
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

function date(raw: Raw, key: string) {
  const v = one(raw, key);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
}

export function parseSurgeryListParams(raw: Raw): SurgeryListParams {
  const status = one(raw, "status");
  const attendance = one(raw, "attendance");
  const priority = one(raw, "priority");
  const sort = one(raw, "sort");
  const size = Number(one(raw, "size"));
  const page = Number(one(raw, "page"));
  return {
    q: one(raw, "q") ?? "",
    status: isSituation(status) ? status : undefined,
    hospital: one(raw, "hospital"),
    attendance: attendance === "particular" || attendance === "convenio" ? attendance : undefined,
    priority:
      priority === "low" || priority === "normal" || priority === "high" || priority === "urgent"
        ? priority
        : undefined,
    requestFrom: date(raw, "rf"),
    requestTo: date(raw, "rt"),
    expectedFrom: date(raw, "ef"),
    expectedTo: date(raw, "et"),
    sort: (SORT_KEYS as readonly string[]).includes(sort ?? "") ? (sort as SortKey) : "created",
    dir: one(raw, "dir") === "asc" ? "asc" : "desc",
    size: (PAGE_SIZES as readonly number[]).includes(size) ? size : 10,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Querystring a partir dos parâmetros (só o que difere do padrão). */
export function surgeryListQuery(p: SurgeryListParams, overrides: Partial<SurgeryListParams> = {}) {
  const v = { ...p, ...overrides };
  const qs = new URLSearchParams();
  if (v.q) qs.set("q", v.q);
  if (v.status) qs.set("status", v.status);
  if (v.hospital) qs.set("hospital", v.hospital);
  if (v.attendance) qs.set("attendance", v.attendance);
  if (v.priority) qs.set("priority", v.priority);
  if (v.requestFrom) qs.set("rf", v.requestFrom);
  if (v.requestTo) qs.set("rt", v.requestTo);
  if (v.expectedFrom) qs.set("ef", v.expectedFrom);
  if (v.expectedTo) qs.set("et", v.expectedTo);
  if (v.sort !== "created") qs.set("sort", v.sort);
  if (v.sort !== "created" || v.dir !== "desc") qs.set("dir", v.dir);
  if (v.size !== 10) qs.set("size", String(v.size));
  if (v.page > 1) qs.set("page", String(v.page));
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export const FILTER_KEYS: (keyof SurgeryListParams)[] = [
  "q",
  "status",
  "hospital",
  "attendance",
  "priority",
  "requestFrom",
  "requestTo",
  "expectedFrom",
  "expectedTo",
];

export function activeFilterCount(p: SurgeryListParams) {
  return FILTER_KEYS.filter((k) => !!p[k]).length;
}
