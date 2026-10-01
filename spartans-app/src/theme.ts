// Spartans look: black + orange, condensed athletic type, square corners,
// thin rules instead of floating cards. Think printed program / box score,
// not a generic app template.

export const color = {
  ink: '#111111',
  paper: '#FFFFFF',
  bone: '#F5F3EF', // warm off-white for alternating bands
  rule: '#E3DFD8',
  ruleDark: '#2A2A2A',
  muted: '#6E6A64',
  orange: '#F26522',
  orangeDeep: '#C94F14',
};

export const font = {
  display: 'Anton_400Regular', // big headlines, scores
  label: 'Oswald_600SemiBold', // nav, section labels, buttons (uppercase)
  labelLight: 'Oswald_400Regular',
  body: 'BarlowCondensed_500Medium',
  bodyBold: 'BarlowCondensed_700Bold',
  num: 'BarlowCondensed_600SemiBold', // table numbers
};

export const space = (n: number) => n * 4;
