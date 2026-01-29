// main.mjs
// Copyright (c) 2026 Ishan Pranav

import { build } from 'esbuild';
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import Handlebars from 'handlebars';
import { basename, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import reading from './data/reading.json' with { type: 'json' }; 

const fileName = fileURLToPath(import.meta.url);
const rootDirectory = dirname(fileName);
const templatesDirectory = join(rootDirectory, 'templates');
const layoutsDirectory = join(templatesDirectory, 'layouts');
const partialsDirectory = join(templatesDirectory, 'partials');
const pagesDirectory = join(templatesDirectory, 'pages');
const outputDirectory = join(rootDirectory, '..', 'docs');

function eqHelper(a, b) {
  a = a.trim();
  b = b.trim();

  if (a === b) {
    return true;
  }

  return false;
}

function getPartial(key, data) {
  const partial = Handlebars.partials[`${data.pageName}-${key}`];

  if (!partial) {
    return "";
  }

  if (typeof partial === 'function') {
    return partial(data);
  } 
  
  return partial;
}

for (const file of readdirSync(partialsDirectory)) {
  const name = basename(file, '.html');
  const content = readFileSync(
    join(partialsDirectory, file),
    'utf8'
  );
  Handlebars.registerPartial(name, content);
}

Handlebars.registerHelper('eq', eqHelper);
Handlebars.registerHelper('geq', (a, b) => a >= b);
Handlebars.registerHelper('linkto', (source, destination) => {
  if (eqHelper(source, destination)) {
    return '#';
  }

  destination = destination.trim();

  return destination + '.html';
});

const layoutSource = readFileSync(
  join(layoutsDirectory, 'main.hbs'),
  'utf8'
);

const layoutTemplate = Handlebars.compile(layoutSource);
const titles = {
  index: "About me",
  privacy: "Privacy policy",
  terms: "Terms of service",
  resume: "Resume",
  reading: "Reading list"
};

reading.sort((left, right) => {
  let result = right.rating - left.rating;

  if (result) {
    return result;
  }

  if (!left.index) {
    left.index = left.title;
  }
  
  if (!right.index) {
    right.index = right.title;
  }

  return left.index.localeCompare(right.index);
});

for (const file of readdirSync(pagesDirectory)) {
  const pageName = basename(file, '.hbs');
  const data = {
    description: "Irvine, California, United States. Independent Consultant. Research Assistant, NYU Stern School of Business. Incoming Investment Banking Analyst @ PNC Capital Markets. Education: New York University.",
    image: 'https://ishanpranav.github.io/website/images/profile-full.jpg',
    title: titles[pageName],
    titles: titles,
    pageName: pageName,
    url: 'https://ishanpranav.github.io/website',
    siteName: 'ishanpranav.github.io',
    legalName: 'Ishan Pranav',
    email: 'ishan.pranav@stern.nyu.edu',
    themeColor: '#32174d',
    reading: reading
  };
  const pageSource = readFileSync(
    join(pagesDirectory, file),
    'utf8'
  );
  const pageTemplate = Handlebars.compile(pageSource);
  const pageHtml = pageTemplate(data);
  const fullHtml = layoutTemplate({
    ...data,
    body: pageHtml,
    head: getPartial('head', data),
    foot: getPartial('foot', data)
  });

  const outputFile = join(
    outputDirectory,
    file.replace('.hbs', '.html')
  );

  writeFileSync(outputFile, fullHtml);
  console.log(`Built: ${outputFile}`);
}

build({
  entryPoints: [join(rootDirectory, 'scripts', 'main.js')],
  bundle: true,
  minify: true,
  outfile: join(outputDirectory, 'scripts', 'bundle.js')
});
