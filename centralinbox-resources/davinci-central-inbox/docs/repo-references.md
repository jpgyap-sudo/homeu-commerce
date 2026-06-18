# Repo and Documentation References

Use these as study references only. Do not copy their code into DaVinciOS.

## Open-source products to study

### Chatwoot
- Repo: `chatwoot/chatwoot`
- Why study it: mature omnichannel inbox, contact/conversation/message concepts, assignment workflow, channel integrations.
- What to learn: inbox model, conversation lifecycle, team assignment, channel adapters.
- What not to copy: Rails code, database structure, UI code.

### Papercups
- Repo: `papercups-io/papercups`
- Why study it: simpler live chat architecture.
- What to learn: website chat widget, conversation dashboard, visitor identification.
- What not to copy: Elixir/Phoenix implementation.

### Erxes
- Repo: `erxes/erxes`
- Why study it: customer engagement suite and inbox-style CRM.
- What to learn: CRM-style contacts, tags, notes, pipelines.
- What not to copy: monorepo implementation.

## Official platform docs to use

### Meta Messenger Platform
Use for Facebook Page Messenger webhook verification, message events, and send API.

### Instagram Messaging API
Use for Instagram Professional/Business account messaging through Meta.

## DaVinciOS recommendation

Do not install Chatwoot as your production inbox unless you want a separate system. Your best path is to build a lightweight inbox directly inside DaVinciOS because:

1. You already have website chatbox.
2. You want RFQ and showroom appointment integration.
3. You want product links and AI sales assistant inside your admin.
4. Your staff should not jump between systems.

## Architecture to follow

```txt
Provider webhook
→ normalize provider payload
→ upsert contact
→ find/open conversation
→ store message
→ show in channel tab
→ staff replies through channel adapter
```
