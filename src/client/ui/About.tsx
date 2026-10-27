/** About 生态家园: what it is, which plugins it lists, what automatic detection means, installing and feedback. */
import type { ReactNode } from 'react'
import { PageHeader, type Translate } from './common.tsx'
import { ISSUES_URL } from './Home.tsx'

/** Groups of question keys; each question `q` has its answer under `q` + 'A'. */
const GROUPS: Array<[string, string[]]> = [
  ['aboutBasics', ['faqWhat', 'faqVsDiscover']],
  ['aboutListing', ['faqWhatListed', 'faqHowOften']],
  ['aboutDetection', ['faqDetectWhat', 'faqDetectWrong']],
  ['aboutInstall', ['faqHowInstall', 'faqManage', 'faqKeepOnly', 'faqReport']],
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
          <a className="ps-btn" href={ISSUES_URL} target="_blank" rel="noopener noreferrer">{t('askButton')}</a>
        </div>
      </div>
    </div>
  )
}
