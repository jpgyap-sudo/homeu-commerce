import { getFooterSections } from '@/lib/theme'
import { FooterBrand } from '@/components/home/FooterBrand'
import { FooterQuickLinks } from '@/components/home/FooterQuickLinks'
import { FooterNewsletter } from '@/components/home/FooterNewsletter'
import { FooterSocial } from '@/components/home/FooterSocial'
import siteConfig from '@/data/site-config.json'

export async function SiteFooter() {
  const year = new Date().getFullYear()
  const sections = await getFooterSections()

  // Build a map of type → config so we render the correct components
  const configMap: Record<string, Record<string, any>> = {}
  for (const sec of sections) {
    configMap[sec.type] = sec.config
  }

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="site-footer__grid page-width">

        {configMap.footer_brand && <FooterBrand config={configMap.footer_brand} />}
        {configMap.footer_quick_links && <FooterQuickLinks />}
        {configMap.footer_newsletter && <FooterNewsletter config={configMap.footer_newsletter} />}
        {configMap.footer_social && <FooterSocial config={configMap.footer_social} />}

      </div>

      <div className="site-footer__copyright page-width">
        <p>&copy; {year} {siteConfig.name}. All rights reserved.</p>
      </div>
    </footer>
  )
}
