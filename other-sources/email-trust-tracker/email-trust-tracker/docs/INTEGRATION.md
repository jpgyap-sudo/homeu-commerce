# Integration Guide

## 1. Create a customer after account registration

```js
await fetch('https://mail.homeu.ph/customers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'client@example.com',
    full_name: 'Client Name',
    mobile: '+63...',
    role: 'architect',
    company: 'ABC Design Studio',
    marketing_consent: true
  })
});
```

## 2. Create campaign

```js
const campaign = await fetch('https://mail.homeu.ph/campaigns', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'June Dining Collection',
    subject: 'New dining tables for your projects',
    sender_email: 'sales@homeu.ph'
  })
}).then(r => r.json());
```

## 3. Register each sent email message

```js
const message = await fetch('https://mail.homeu.ph/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    campaign_id: campaign.id,
    customer_id: customer.id,
    provider_message_id: 'ses-message-id-or-postmark-id'
  })
}).then(r => r.json());
```

## 4. Add open pixel to email HTML

```html
<img src="https://mail.homeu.ph/t/open/MESSAGE_ID.gif" width="1" height="1" alt="" style="display:none" />
```

## 5. Wrap email links

Original link:

```txt
https://homeu.ph/products/saddle-industrial-chair
```

Tracked link:

```txt
https://mail.homeu.ph/t/click/MESSAGE_ID?url=https%3A%2F%2Fhomeu.ph%2Fproducts%2Fsaddle-industrial-chair
```

## 6. Add the contact widget after registration

```html
<a href="https://mail.homeu.ph/contact.vcf?customer_id=CUSTOMER_ID">
  Add HomeU to Contacts
</a>
```

You cannot automatically add HomeU to Gmail contacts without user action. The safe UX is a `.vcf` download button.

## 7. Track website events

Product view:

```js
await fetch('https://mail.homeu.ph/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customer_id: 'CUSTOMER_ID',
    event_type: 'product_view',
    product_id: 'saddle-industrial-chair',
    url: location.href
  })
});
```

RFQ submitted:

```js
await fetch('https://mail.homeu.ph/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customer_id: 'CUSTOMER_ID',
    event_type: 'rfq_submit',
    metadata: {
      item_count: 5,
      source: 'rfq-cart'
    }
  })
});
```
