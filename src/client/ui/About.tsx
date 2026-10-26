/** About 生态家园: what it is, installing, and what the review looks at, as grouped questions. */
import type { ReactNode } from 'react'
import { PageHeader, type Translate } from './common.tsx'

const RECOMMEND_URL = 'https://github.com/yang051211/dsh-plugin-store/issues'

/** Groups of question keys; each question `q` has its answer under `q` + 'A'. */
const GROUPS: Array<[string, string[]]> = [
  ['aboutBasics', ['faqWhat', 'faqVsDiscover']],
  ['aboutInstall', ['faqHowInstall', 'faqWhereIsIt', 'faqWhyOld']],
  ['aboutReview', ['faqReviewWhat', 'faqNetwork']],
]

export function AboutView({ t }: { t: Translate }): ReactNode {
  return (
    <div className="ps-about">
      <PageHeader crumb={t('aboutCrumb')} title={t('aboutTitle')} intro={t('aboutIntro')} />
      <div className="ps-faq">
        {GROUPS.map(([group, questions]) => (
          <section key={group}>
            <h2>{t(group)}</h2>
            {questions.map(q => <div key={q}><h3>{t(q)}</h3><p>{t(`${q}A`)}</p></div>)}
          </section>
        ))}
        <div className="ps-ask">
          <div><b>{t('askTitle')}</b><span>{t('askBody')}</span></div>
          <a className="ps-btn" href={RECOMMEND_URL} target="_blank" rel="noopener noreferrer">{t('askButton')}</a>
        </div>
      </div>
    </div>
  )
}
