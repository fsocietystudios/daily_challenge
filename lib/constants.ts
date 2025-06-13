export const PLUGA_OPTIONS = [
  'הבשור',
  'רמון',
  'תמר',
  'צין',
  'פארן',
] as const;

export const TEAM_OPTIONS = {
  'הבשור': ['צוות 1', 'צוות 2', 'צוות 3'],
  'רמון': ['צוות 4', 'צוות 5', 'צוות 6'],
  'תמר': ['צוות 7', 'צוות 8', 'צוות 9'],
  'צין': ['צוות 10', 'צוות 11', 'צוות 12'],
  'פארן': ['צוות 13', 'צוות 14', 'צוות 15'],
} as const;

export type Pluga = typeof PLUGA_OPTIONS[number];
export type Team = typeof TEAM_OPTIONS[Pluga][number]; 