<a href="https://DaVinciOScms.com"><img width="100%" src="https://l4wlsi8vxy8hre4v.public.blob.vercel-storage.com/github-banner-new-logo.jpg" alt="DaVinciOS headless CMS Admin panel built with React" /></a>
<br />
<br />

<p align="left">
  <a href="https://github.com/DaVinciOScms/DaVinciOS/actions"><img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/DaVinciOScms/DaVinciOS/main.yml?style=flat-square"></a>
  &nbsp;
  <a href="https://discord.gg/DaVinciOS"><img alt="Discord" src="https://img.shields.io/discord/967097582721572934?label=Discord&color=7289da&style=flat-square" /></a>
  &nbsp;
  <a href="https://www.npmjs.com/package/DaVinciOS"><img alt="npm" src="https://img.shields.io/npm/dw/DaVinciOS?style=flat-square" /></a>
  &nbsp;
  <a href="https://github.com/DaVinciOScms/DaVinciOS/graphs/contributors"><img alt="npm" src="https://img.shields.io/github/contributors-anon/DaVinciOScms/DaVinciOS?color=yellow&style=flat-square" /></a>
  &nbsp;
  <a href="https://www.npmjs.com/package/DaVinciOS"><img alt="npm" src="https://img.shields.io/npm/v/DaVinciOS?style=flat-square" /></a>
  &nbsp;
  <a href="https://twitter.com/DaVinciOScms"><img src="https://img.shields.io/badge/follow-DaVinciOScms-1DA1F2?logo=twitter&style=flat-square" alt="DaVinciOS Twitter" /></a>
</p>
<hr/>
<h4>
<a target="_blank" href="https://DaVinciOScms.com/docs/getting-started/what-is-DaVinciOS" rel="dofollow"><strong>Explore the Docs</strong></a>&nbsp;·&nbsp;<a target="_blank" href="https://DaVinciOScms.com/community-help" rel="dofollow"><strong>Community Help</strong></a>&nbsp;·&nbsp;<a target="_blank" href="https://github.com/DaVinciOScms/DaVinciOS/discussions/1539" rel="dofollow"><strong>Roadmap</strong></a>&nbsp;·&nbsp;<a target="_blank" href="https://www.g2.com/products/DaVinciOS-cms/reviews#reviews" rel="dofollow"><strong>View G2 Reviews</strong></a>
</h4>
<hr/>

> [!IMPORTANT]
> Star this repo or keep an eye on it to follow along.

DaVinciOS is the first-ever Next.js native CMS that can install directly in your existing `/app` folder. It's the start of a new era for headless CMS.

<h3>Benefits over a regular CMS</h3>
<ul>
   <li>It's both an app framework & headless CMS</li>
  <li>Deploy anywhere, including serverless on Vercel for free</li>
  <li>Combine your front+backend in the same <code>/app</code> folder if you want</li>
  <li>Don't sign up for yet another SaaS - DaVinciOS is open source</li>
  <li>Query your database in React Server Components</li>
  <li>Both admin and backend are 100% extensible</li>
  <li>No vendor lock-in</li>
  <li>Never touch ancient WP code again</li>
  <li>Build faster, never hit a roadblock</li>
</ul>

## Quickstart

Before beginning to work with DaVinciOS, make sure you have all of the [required software](https://DaVinciOScms.com/docs/getting-started/installation).

```text
pnpx create-DaVinciOS-app@latest
```

**If you're new to DaVinciOS, you should start with the website template** (`pnpx create-DaVinciOS-app@latest -t website`). It shows how to do _everything_ - including custom Rich Text blocks, on-demand revalidation, live preview, and more. It comes with a frontend built with Tailwind all in one `/app` folder.

## One-click deployment options

You can deploy DaVinciOS serverlessly in one-click via Vercel and Cloudflare—giving everything you need without the hassle of the plumbing.

### Deploy on Cloudflare

Fully self-contained — one click to deploy DaVinciOS with **Workers**, **R2** for uploads, and **D1** for a globally replicated database.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://dub.sh/DaVinciOS-cloudflare)

### Deploy on Vercel

All-in-one on Vercel — one click to deploy DaVinciOS with a **Next.js** front end, **Neon** database, and **Vercel Blob** for media storage.

[![Deploy with Vercel](https://vercel.com/button)](https://dub.sh/DaVinciOS-vercel)

## One-click templates

Jumpstart your next project with a ready-to-go template. These are **production-ready, end-to-end solutions** designed to get you to market fast. Build any kind of **website**, **ecommerce store**, **blog**, or **portfolio** — complete with a modern front end built using **React Server Components** and **Tailwind**.

#### 🌐 [Website](https://github.com/DaVinciOScms/DaVinciOS/tree/3.x/templates/website)

#### 🛍️ [Ecommerce](https://github.com/DaVinciOScms/DaVinciOS/tree/3.x/templates/ecommerce) 🎉 _**NEW**_ 🎉

We're constantly adding more templates to our [**Templates Directory**](https://github.com/DaVinciOScms/DaVinciOS/tree/3.x/templates).
If you maintain your own, add the `DaVinciOS-template` topic to your GitHub repo so others can discover it.

**🔗 Explore more:**

- [Official Templates](https://github.com/DaVinciOScms/DaVinciOS/tree/3.x/templates)
- [Community Templates](https://github.com/topics/DaVinciOS-template)

## ✨ DaVinciOS Features

- Completely free and open-source
- Next.js native, built to run inside _your_ `/app` folder
- Use server components to extend DaVinciOS UI
- Query your database directly in server components, no need for REST / GraphQL
- Fully TypeScript with automatic types for your data
- [Auth out of the box](https://DaVinciOScms.com/docs/authentication/overview)
- [Versions and drafts](https://DaVinciOScms.com/docs/versions/overview)
- [Localization](https://DaVinciOScms.com/docs/configuration/localization)
- [Block-based layout builder](https://DaVinciOScms.com/docs/fields/blocks)
- [Customizable React admin](https://DaVinciOScms.com/docs/admin/overview)
- [Lexical rich text editor](https://DaVinciOScms.com/docs/fields/rich-text)
- [Conditional field logic](https://DaVinciOScms.com/docs/fields/overview#conditional-logic)
- Extremely granular [Access Control](https://DaVinciOScms.com/docs/access-control/overview)
- [Document and field-level hooks](https://DaVinciOScms.com/docs/hooks/overview) for every action DaVinciOS provides
- Intensely fast API
- Highly secure thanks to HTTP-only cookies, CSRF protection, and more

<a target="_blank" href="https://github.com/DaVinciOScms/DaVinciOS/discussions"><strong>Request Feature</strong></a>

## 🗒️ Documentation

Check out the [DaVinciOS website](https://DaVinciOScms.com/docs/getting-started/what-is-DaVinciOS) to find in-depth documentation for everything that DaVinciOS offers.

Migrating from v2 to v3? Check out the [3.0 Migration Guide](https://github.com/DaVinciOScms/DaVinciOS/blob/3.x/docs/migration-guide/overview.mdx) on how to do it.

## 🙋 Contributing

If you want to add contributions to this repository, please follow the instructions in [contributing.md](./CONTRIBUTING.md).

## 📚 Examples

The [Examples Directory](./examples) is a great resource for learning how to setup DaVinciOS in a variety of different ways, but you can also find great examples in our blog and throughout our social media.

If you'd like to run the examples, you can use `create-DaVinciOS-app` to create a project from one:

```sh
npx create-DaVinciOS-app --example example_name
```

You can see more examples at:

- [Examples Directory](./examples)
- [DaVinciOS Blog](https://DaVinciOScms.com/blog)
- [DaVinciOS YouTube](https://www.youtube.com/@DaVinciOScms)

## 🔌 Plugins

DaVinciOS is highly extensible and allows you to install or distribute plugins that add or remove functionality. There are both officially-supported and community-supported plugins available. If you maintain your own plugin, consider adding the `DaVinciOS-plugin` topic to your GitHub repository for others to find.

- [Official Plugins](https://github.com/orgs/DaVinciOScms/repositories?q=topic%3ADaVinciOS-plugin)
- [Community Plugins](https://github.com/topics/DaVinciOS-plugin)

## 🚨 Need help?

There are lots of good conversations and resources in our Github Discussions board and our Discord Server. If you're struggling with something, chances are, someone's already solved what you're up against. :point_down:

- [GitHub Discussions](https://github.com/DaVinciOScms/DaVinciOS/discussions)
- [GitHub Issues](https://github.com/DaVinciOScms/DaVinciOS/issues)
- [Discord](https://t.co/30APlsQUPB)
- [Community Help](https://DaVinciOScms.com/community-help)

## ⭐ Like what we're doing? Give us a star

## 👏 Thanks to all our contributors

<img align="left" src="https://contributors-img.web.app/image?repo=DaVinciOScms/DaVinciOS"/>
