# desering.org Webstudio

This repository pulls the desering.org project from Webstudio Cloud and deploys
it as a static website to GitHub Pages.

Only changes that have been PUBLISHED in the web interface are "pulled" by this
automation.

## Webstudio CLI

[GitHub](https://github.com/webstudio-is/webstudio/tree/main/packages/cli) / [NPM](https://www.npmjs.com/package/webstudio)

Install globally:
```shell
npm install -g webstudio@latest
```

Run without installing:
```shell
npx webstudio@latest
```

## Exporting

Webstudio offers dynamic (`docker`, `vercel`, `netlify`) and static (`ssg`,
`ssg-netlify`, `ssg-vercel`) export options. We are using `ssg` in this repo.

To connect to a Webstudio project, either run `webstudio` and follow the guide
or run `webstudio link --link <share-link-here>`. This will create the following
necessary files:

1. `~/.config/webstudio-nodejs/webstudio-config.json` - contains Webstudio project IDs and access tokens
2. `my-project-directory/.webstudio/config.json` - links `my-project-directory` to a Webstudio project

Click "Publish" in the Webstudio web interface to ensure that the latest changes
will be used in the next steps.

Sync site data from Webstudio to your local directory:
```shell
webstudio sync
```

Create a local project for SSG that builds with the data synced from Webstudio:
```shell
webstudio build --template ssg
```

Install dependencies:
```shell
npm install
```

Extra step: remove redirects that would break a static build:
```shell
find . -type f -name "+data.ts" -exec sed -i '' -e 's|throw redirect(pageMeta.redirect, status);|//throw redirect(pageMeta.redirect, status);|g' {} \;
```

Build the static site:
```shell
npm run build
```

Now, the `dist/client/` directory can be statically deployed.

## Caveats

Tl;Dr: Yes, technically it is possible to export from Webstudio. The resulting
code is a major PITA though.

1. Design and content are not separate.
   * All data is contained in a huge `data.json` file
   * Different "build targets" (ssg, vercel, docker, etc.) are static templates
     that use the data file
   * Untangling this is difficult

2. Webstudio does not support static deployments with base paths other than `/`.
   * This makes a PoC difficult but is not an issue for the final site.

3. The "Events" page itself renders correctly based on data from our CMS, but
   pages for each event do not.
   * This requires some rework: either generate event pages at build time, or
     build an SPA that can handle navigation to paths that don't exist on the server.
   * Maybe this behaves different in "dynamic" builds, which might also allow
     for easier extraction of a usable website.

## Docs

* https://docs.webstudio.is/university/self-hosting#exporting
* https://docs.webstudio.is/university/self-hosting/cli
