import { RRule } from "rrule";

/**
 * Gera datas de recorrencia para um dado RRULE dentro de um periodo.
 * Retorna datas em UTC (sem componente de hora) para facilitar comparacao com campos date do banco.
 */
export function generateRecurrenceDates(
  rule: string,
  startDate: Date,
  endDate?: Date
): Date[] {
  if (!rule) return [];

  try {
    // rrule espera DTSTART como parte do conjunto de opcoes ou via string completa
    const rrule = RRule.fromString(
      rule.startsWith("DTSTART") ? rule : `DTSTART:${formatDTSTART(startDate)}\n${rule}`
    );

    const until = endDate ?? new Date(startDate.getFullYear() + 2, startDate.getMonth(), startDate.getDate());

    return rrule.between(startDate, until, true);
  } catch {
    return [];
  }
}

/**
 * Gera datas para um mes/ano especifico (usado pela API de recorrentes).
 * Retorna todas as ocorrencias dentro do mes solicitado.
 */
export function generateRecurrenceDatesForMonth(
  rule: string,
  startDate: Date,
  targetMonth: number, // 0-indexed
  targetYear: number,
  recurrenceEnd?: Date | null
): Date[] {
  if (!rule) return [];

  try {
    const monthStart = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);
    const monthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    // Se o evento ainda nao comecou ate o fim do mes, nao ha ocorrencias
    if (startDate > monthEnd) return [];

    // Limite de recorrencia
    const until = recurrenceEnd && recurrenceEnd < monthEnd ? recurrenceEnd : monthEnd;

    const rrule = RRule.fromString(
      rule.startsWith("DTSTART") ? rule : `DTSTART:${formatDTSTART(startDate)}\n${rule}`
    );

    // O inicio da busca e o maior entre startDate do evento e inicio do mes
    const after = startDate > monthStart ? startDate : monthStart;

    return rrule.between(after, until, true);
  } catch {
    return [];
  }
}

function formatDTSTART(date: Date): string {
  const y = date.getUTCFullYear().toString().padStart(4, "0");
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = date.getUTCDate().toString().padStart(2, "0");
  return `${y}${m}${d}T000000Z`;
}

const DAY_NAMES: Record<string, string> = {
  MO: "Seg",
  TU: "Ter",
  WE: "Qua",
  TH: "Qui",
  FR: "Sex",
  SA: "Sab",
  SU: "Dom",
};

/**
 * Converte uma string RRULE em texto legivel em PT-BR.
 * Ex: "FREQ=WEEKLY;BYDAY=MO,WE,FR" → "Semanalmente (Seg, Qua, Sex)"
 */
export function parseRRuleToLabel(rule: string): string {
  if (!rule) return "Nao repetir";

  try {
    // Extrai apenas a linha RRULE (sem DTSTART se houver)
    const rruleLine = rule
      .split("\n")
      .find((l) => l.startsWith("FREQ") || l.startsWith("RRULE:"));

    const clean = (rruleLine ?? rule)
      .replace(/^RRULE:/, "")
      .trim();

    const params: Record<string, string> = {};
    for (const part of clean.split(";")) {
      const [key, value] = part.split("=");
      if (key && value !== undefined) params[key] = value;
    }

    const freq = params["FREQ"];
    const byday = params["BYDAY"];
    const interval = params["INTERVAL"] ? Number(params["INTERVAL"]) : 1;

    let base = "";

    switch (freq) {
      case "DAILY":
        base = interval === 1 ? "Diariamente" : `A cada ${interval} dias`;
        break;
      case "WEEKLY":
        base = interval === 1 ? "Semanalmente" : `A cada ${interval} semanas`;
        break;
      case "MONTHLY":
        base = interval === 1 ? "Mensalmente" : `A cada ${interval} meses`;
        break;
      case "YEARLY":
        base = interval === 1 ? "Anualmente" : `A cada ${interval} anos`;
        break;
      default:
        return rule;
    }

    if (byday) {
      const days = byday
        .split(",")
        .map((d) => DAY_NAMES[d.replace(/[0-9+-]/g, "")] ?? d)
        .join(", ");
      return `${base} (${days})`;
    }

    return base;
  } catch {
    return rule;
  }
}
