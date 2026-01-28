// main.mjs
// Copyright (c) 2026 Ishan Pranav

import { build } from 'esbuild';
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import Handlebars from 'handlebars';
import { basename, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const fileName = fileURLToPath(import.meta.url);
const rootDirectory = dirname(fileName);
const templatesDirectory = join(rootDirectory, 'templates');
const layoutsDirectory = join(templatesDirectory, 'layouts');
const partialsDirectory = join(templatesDirectory, 'partials');
const pagesDirectory = join(templatesDirectory, 'pages');
const outputDirectory = join(rootDirectory, '..', 'docs');

for (const file of readdirSync(partialsDirectory)) {
  const name = basename(file, '.hbs');
  const content = readFileSync(
    join(partialsDirectory, file),
    'utf8'
  );
  Handlebars.registerPartial(name, content);
}

Handlebars.registerHelper('eq', (a, b) => a == b);
Handlebars.registerHelper('linkto', (source, destination) => {
  if (source === destination) {
    return "#";
  } 
  
  return destination + '.html';
});

const layoutSource = readFileSync(
  join(layoutsDirectory, 'main.hbs'),
  'utf8'
);

const layoutTemplate = Handlebars.compile(layoutSource);
const titles = {
  'index': "About me",
  'privacy': "Privacy policy",
  'terms': "Terms of service"
};

for (const file of readdirSync(pagesDirectory)) {
  const pageName = basename(file, '.hbs');
  const data = {
    description: "Irvine, California, United States. Independent Consultant. Research Assistant, NYU Stern School of Business. Incoming Investment Banking Analyst @ PNC Capital Markets. Education: New York University.",
    image: 'https://ishanpranav.github.io/website/images/profile-full.jpg',
    title: titles[pageName],
    pageName: pageName,
    url: 'https://ishanpranav.github.io/website',
    siteName: 'ishanpranav.github.io',
    legalName: 'Ishan Pranav',
    email: 'ishan.pranav@stern.nyu.edu'
  };
  const pageSource = readFileSync(
    join(pagesDirectory, file),
    'utf8'
  );
  const pageTemplate = Handlebars.compile(pageSource);
  const headPartial = Handlebars.partials[`${pageName}-head`];
  let headHtml = "";

  if (headPartial) {
    if (typeof headPartial === 'function') {
      headHtml = headPartial(data);
    } else {
      headHtml = headPartial;
    }
  }

  const pageHtml = pageTemplate(data);
  const fullHtml = layoutTemplate({
    ...data,
    body: pageHtml,
    head: headHtml
  });

  const outputFile = join(
    outputDirectory,
    file.replace('.hbs', '.html')
  );

  writeFileSync(outputFile, fullHtml);
  console.log(`Built: ${outputFile}`);
}

build({
  entryPoints: [ join(rootDirectory, 'scripts', 'main.js') ],
  bundle: true,
  minify: true,
  outfile: join(outputDirectory, 'scripts', 'bundle.js')
});
