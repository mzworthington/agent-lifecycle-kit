export type JsonFindingStatus = 'ok' | 'fail';

export interface JsonFinding {
  id: string;
  status: JsonFindingStatus;
  path: string;
  detail?: string;
}

export interface JsonCommandReport {
  ok: boolean;
  command: string;
  findings: JsonFinding[];
}

export function printJsonReport(report: JsonCommandReport, write: (msg: string) => void = console.log): void {
  write(JSON.stringify(report));
}
