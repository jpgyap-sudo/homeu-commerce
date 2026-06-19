import Link from 'next/link'
import navigation from '@/data/navigation.json'

export function FooterQuickLinks() {
  return (
    <div className="footer-section footer-section--links">
      <h3 className="footer-section__title">Quick Links</h3>
      <ul className="footer-section__linklist" role="list">
        {navigation.footer.map((item) => (
          <li key={item.title}>
            <Link href={item.href} className="footer-section__link">{item.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
