import siteConfig from '@/data/site-config.json'

interface FooterBrandProps {
  config?: {
    name?: string
    tagline?: string
    address1?: string
    city?: string
    country?: string
    email?: string
    phone?: string
  }
}

export function FooterBrand({ config = {} }: FooterBrandProps) {
  const name = config.name || siteConfig.name
  const tagline = config.tagline || siteConfig.tagline
  const address1 = config.address1 || siteConfig.address.address1
  const city = config.city || siteConfig.address.city
  const country = config.country || siteConfig.address.country
  const email = config.email || siteConfig.email
  const phone = config.phone || siteConfig.phone

  return (
    <div className="footer-section footer-section--brand">
      <h3 className="footer-section__title">{name}</h3>
      <p className="footer-section__tagline">{tagline}</p>
      <address className="footer-section__address">
        <p>{address1}</p>
        <p>{city}, {country}</p>
        <p><a href={`mailto:${email}`}>{email}</a></p>
        <p><a href={`tel:${phone}`}>{phone}</a></p>
      </address>
    </div>
  )
}
