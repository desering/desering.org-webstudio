# desering.org Webstudio

This repository pulls the desering.org project from Webstudio Cloud and deploys
it as a static website to GitHub Pages.

Only changes that have been PUBLISHED in the web interface are "pulled" by this
automation.

## Webstudio CLI ([GitHub](https://github.com/webstudio-is/webstudio/tree/main/packages/cli) / [NPM](https://www.npmjs.com/package/webstudio))

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
`ssg-netlify`, `ssg-vercel`) export options
([docs](https://docs.webstudio.is/university/self-hosting)). We are using `ssg`
in this repo.

To connect to a Webstudio project, either run `webstudio` and follow the guide
or run `webstudio link --link <share-link-here>`. This will create the following
necessary files:

1. `~/.config/webstudio-nodejs/webstudio-config.json` - contains Webstudio project IDs and access tokens
2. `my-project-directory/.webstudio/config.json` - links `my-project-directory` to a Webstudio project

Click "Publish" in Webstudio Cloud to ensure that the latest changes will be
used in the next steps:

1. Sync site data from Webstudio Cloud to your local directory:
   ```shell
   webstudio sync
   ```
   This will download and populate `.webstudio/data.json`.

2. Generate a local project based on the `ssg` template:
   ```shell
   webstudio build --template ssg
   ```
   This generates a [vike](https://vike.dev/) project based on the
   [ssg template](https://github.com/webstudio-is/webstudio/tree/main/packages/cli/templates/ssg)
  with content from the `.webstudio/data.json` file. Files in
  `app/__generated__/*` contain the content, structural elements, style, etc.,
  and files in `pages/**/*` contain generic templates that depend on the
  content in `app/__generated__/*`. This project can be checked in to git for
  further development, and/or used to build a static site.

3. Install dependencies:
   ```shell
   npm install
   ```

4. Remove redirects that would break a static build:
   ```shell
   find . -type f -name "+data.ts" -exec sed -i '' -e 's|throw redirect(pageMeta.redirect, status);|//throw redirect(pageMeta.redirect, status);|g' {} \;
   ```
   The Webstudio docs mention that [redirects are not supported](https://docs.webstudio.is/university/self-hosting#static-site),
   but the build fails if redirects are present at all, instead of simply ignoring or skipping them.

5. Build the static site:
   ```shell
   npm run build
   ```
   This renders static pages based on the generated project files.

Now, the `dist/client/` directory can be statically deployed, for example to
GitHub Pages or Cloudflare Pages.

> [!IMPORTANT]
> The SSG build is meant to work only with a base path of `/` - deployments at
> `mydomain.com/my-webstudio-site/` are not officially supported. Continue
> reading for solutions.

## Local development

To develop and edit the site, simply use the vite dev server:
```shell
npm run dev
```

To build the static site and serve it at the root path:
```shell
npm run build
python -m http.server --directory dist/client 8020
```

To build the static site and serve it at a non-default base path:
```shell
npm run build
mv dist/client/ dist/desering.org-webstudio/
python -m http.server --directory dist 8020
```

> [!IMPORTANT]
> For this to work correctly, you will need to prepare a few things before the
> build. Read [Static deployment at non-default Public Base Paths](#static-deployment-at-non-default-public-base-paths)
> below.

## Practicality & Caveats

> Tl;Dr: Yes, it is possible to export from Webstudio. The resulting code is
> generated and not easy to work with. A rebuild is necessary, because editing
> content in the exported site cannot be left to non-technical people.

1. Design and content are not separate.
   * All data is contained in a huge `data.json` file
   * Different "build targets" (ssg, vercel, docker, etc.) are static templates
     that use the data file
   * The `ssg` build target generates `.tsx` files, but they depend on
     components built and maintained by Webstudio
   * Untangling this is difficult

2. Webstudio does not support static deployments with base paths other than `/`.
   * This makes a PoC difficult but is not an issue for the final site.
   * For the fun of it, this repository contains a PoC for making it work. See
     [Static deployment at non-default Public Base Paths](#static-deployment-at-non-default-public-base-paths).

3. The "Events" page itself renders correctly based on data from our CMS, but
   pages for each event do not.
   * This requires some rework: either generate event pages at build time, or
     build an SPA that can handle navigation to paths that don't exist on the server.
   * Maybe this behaves different in "dynamic" builds, which might also allow
     for easier extraction of a usable website.

## Static deployment at non-default Public Base Paths

### Problem analysis

To support static deployments at non-default public base paths, the following
areas need to be covered:

**CSS and JS assets** are covered by setting
[the `base` option in vite](https://vite.dev/config/shared-options#base).

**Navigation links** in `app/__generated__/*` files use the Webstudio
[`Link` component](https://github.com/webstudio-is/webstudio/blob/main/packages/sdk-components-react/src/link.tsx)
which does not support prefixing with a base path.

**Image URLs** are run through the `imageLoader` included in the `ssg` template,
but it passes the given file through
[without modifications](https://github.com/webstudio-is/webstudio/blob/main/packages/cli/templates/ssg/app/constants.mjs#L11).

**Other assets** like the social image, favicon, fonts and background images
inside the
[`+Head.tsx` component](https://github.com/webstudio-is/webstudio/blob/main/packages/cli/templates/ssg/app/route-templates/html/%2BHead.tsx)
are rendered using both the `assetBaseUrl` and the `imageLoader` which does not
do anything and is again missing any base path option.

### Preliminary work

To understand the inner workings of the Webstudio template and the build process,
a few workarounds have been implemented as a PoC. For details, have a look at
the [GitHub Actions Workflow](.github/workflows/deploy.yaml).

In short, each of the above-mentioned areas is covered with a pre-build step:

1. **Navigation links**: introducing a new vite plugin that that adds the
   vite `base` prefix to links in both `Link` and `RichTextLink` components.
2. **Image URLs**: patching the `imageLoader` function to prefix image paths
   with both the vite `base` parameter and the `assetBaseUrl`, if given.
3. **Other assets**: introducing a new `assetLoader` function to prefix assets
   references inside the `+Head.tsx` component with the vite `base` parameter.

This is the first step towards more elegant or correct solutions, like:

1. Implementing a better [`Link` component](https://github.com/webstudio-is/webstudio/blob/main/packages/sdk-components-react/src/link.tsx)
   that supports the `base` parameter in `vite.config.ts`, to get rid of the
   vite plugin that prefixes navigation links with the base path.
2. Not exporting the `assetBaseUrl` at all and instead making all file paths use
   either the existing `imageLoader`, or a new `assetLoader`, in case images and
   other assets need different treatment.
