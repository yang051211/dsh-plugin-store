/**
 * A category for a package from its keywords, name and description. ASCII words must match a whole word ("ui" is
 * not in "build"); CJK words match anywhere in the text. Categories are tried in configured order; none → 'other'.
 */
const ASCII = /^[a-z0-9-]+$/

export function categorize(facts, categories) {
  const text = [facts.name.replace(/^@[^/]+\//, ''), ...facts.keywords, facts.description].join(' ').toLowerCase()
  const words = new Set(text.split(/[^a-z0-9]+/).filter(Boolean))
  for (const category of categories) {
    for (const word of category.match ?? []) {
      const w = word.toLowerCase()
      if (ASCII.test(w) ? w.split('-').every(part => words.has(part)) : text.includes(w)) return category.id
    }
  }
  return 'other'
}
