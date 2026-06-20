import Handlebars from 'handlebars';

export function renderTemplate({ html, text, subject }, contact, tracking) {
  const data = {
    contact,
    firstName: contact.first_name || 'there',
    company: contact.company || '',
    unsubscribeUrl: tracking.unsubscribeUrl,
    trackingPixelUrl: tracking.trackingPixelUrl,
    contactCardUrl: tracking.contactCardUrl
  };

  const renderedHtml = Handlebars.compile(html)(data);
  const renderedText = text ? Handlebars.compile(text)(data) : stripHtml(renderedHtml);
  const renderedSubject = Handlebars.compile(subject)(data);

  return {
    subject: renderedSubject,
    html: `${renderedHtml}\n<img src="${tracking.trackingPixelUrl}" width="1" height="1" style="display:none" alt="" />`,
    text: `${renderedText}\n\nUnsubscribe: ${tracking.unsubscribeUrl}`
  };
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
