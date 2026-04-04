function generatePatterns(firstName, lastName, domain) {
  if (!firstName || !lastName || !domain) return [];
  const f = firstName.toLowerCase();
  const l = lastName.toLowerCase();
  const d = domain.toLowerCase();
  return [
    `${f}.${l}@${d}`,
    `${f[0]}${l}@${d}`,
    `${f}${l}@${d}`,
    `${f}_${l}@${d}`,
    `${f}@${d}`,
    `${l}.${f}@${d}`,
    `${f[0]}.${l}@${d}`,
  ];
}

module.exports = { generatePatterns };
