export interface TaskEAC {
  actualHours: number;
  estimateHours: number;
  completionPct: number;
  eacHours: number;
  varianceHours: number;
  status: 'under' | 'on-track' | 'over';
}

export function calculateEAC(
  actualHours: number,
  estimateHours: number,
  completionPct: number
): TaskEAC {
  if (completionPct === 0 || actualHours === 0) {
    return {
      actualHours,
      estimateHours,
      completionPct,
      eacHours: estimateHours,
      varianceHours: 0,
      status: 'on-track',
    };
  }

  if (completionPct >= 1) {
    const varianceHours = Math.round((actualHours - estimateHours) * 100) / 100;
    const variancePct = estimateHours > 0 ? (varianceHours / estimateHours) : 0;
    return {
      actualHours,
      estimateHours,
      completionPct,
      eacHours: actualHours,
      varianceHours,
      status: variancePct < -0.05 ? 'under' : variancePct > 0.05 ? 'over' : 'on-track',
    };
  }

  const etc = actualHours * ((1 - completionPct) / completionPct);
  const eacHours = Math.round((actualHours + etc) * 100) / 100;
  const varianceHours = Math.round((eacHours - estimateHours) * 100) / 100;
  const variancePct = estimateHours > 0 ? (varianceHours / estimateHours) : 0;

  const status: 'under' | 'on-track' | 'over' =
    variancePct < -0.05 ? 'under' : variancePct > 0.05 ? 'over' : 'on-track';

  return { actualHours, estimateHours, completionPct, eacHours, varianceHours, status };
}
