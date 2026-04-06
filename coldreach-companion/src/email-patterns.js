function generatePatterns(firstName, lastName, domain) {
  if (!firstName || !domain) return [];
  const f = firstName.toLowerCase();
  const l = (lastName || '').toLowerCase();
  const d = domain.toLowerCase();

  const patterns = [
    `${f}.${l}@${d}`,       // john.doe@
    `${f}${l}@${d}`,        // johndoe@
    `${f[0]}${l}@${d}`,     // jdoe@
    `${f}_${l}@${d}`,       // john_doe@
    `${f}-${l}@${d}`,       // john-doe@
    `${f}@${d}`,            // john@
    `${l}.${f}@${d}`,       // doe.john@
    `${l}${f[0]}@${d}`,     // doej@
    `${f[0]}.${l}@${d}`,    // j.doe@
    `${f}.${l[0]}@${d}`,    // john.d@
    `${f[0]}${l[0]}@${d}`,  // jd@
    `${l}@${d}`,            // doe@
    `${f}${l[0]}@${d}`,     // johnd@
    `${f[0]}_${l}@${d}`,    // j_doe@
    `${f[0]}-${l}@${d}`,    // j-doe@
  ];

  // Filter out patterns with empty parts (when lastName is missing)
  return [...new Set(patterns.filter(p => !p.includes('.@') && !p.includes('_@') && !p.includes('-@') && !p.startsWith('@')))];
}

module.exports = { generatePatterns };
