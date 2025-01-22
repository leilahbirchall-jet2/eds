import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  readBlockConfig,
  toCamelCase,
} from './aem.js';

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildHeroBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Reads the 'Layout' key from section metadata,
 * specifically with the 'columns' value.
 *
 * This will look for a table inside of the 'columns'
 * value, specifing the widths to display the columns at.
 * Once found, these are converted into --left and --right
 * CSS variables to apply to the section element for use in
 * the {@link buildLayoutContainer} function.
 *
 * @param {Element} main The container element
 */
function readLayoutMeta(main) {
  const checkColExists = (column, name) => column && column.innerHTML.toLowerCase().includes(name);

  main.querySelectorAll(':scope > div').forEach((section) => {
    const sectionMeta = section.querySelector('div.section-metadata');

    if (sectionMeta) {
      const sectionMetaConfig = readBlockConfig(sectionMeta);
      const configKey = 'layout';
      const configValue = 'columns';
      const hasLayoutConfig = Object.prototype.hasOwnProperty.call(sectionMetaConfig, configKey);
      const hasColumnsConfig = sectionMetaConfig[configKey] === configValue;

      if (hasLayoutConfig && hasColumnsConfig) {
        sectionMeta.querySelectorAll(':scope > div').forEach((row) => {
          if (row.children) {
            const cols = [...row.children];
            const equalToLayout = checkColExists(cols[0], configKey);
            const equalToColumns = checkColExists(cols[1], configValue);

            if (equalToLayout && equalToColumns) {
              const col = cols[1];

              if (col.querySelector('table')) {
                const table = col.querySelector('table');
                const tableData = table.querySelectorAll('td');
                [...tableData].forEach((value, index) => {
                  const varName = `--${index === 0 ? 'left' : 'right'}`;
                  section.style.setProperty(varName, value.innerHTML);
                });
                section.dataset[toCamelCase(configKey)] = sectionMetaConfig[configKey];
              }
            }
          }
        });
      }
    }
  });
}

/**
 * Builds two column grid, dependent
 * on 'Layout' section metadata.
 *
 * @param {Element} main The container element
 */
function buildLayoutContainer(main) {
  const createDiv = (content) => {
    const div = document.createElement('div');
    div.classList.add('grid-column');
    div.append(content);
    return div;
  };

  main.querySelectorAll(':scope > .section[data-layout="columns"]').forEach((section) => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('default-content-wrapper');

    if (section.children.length === 2) {
      const leftContent = section.children[0];
      const rightContent = section.children[1];

      const leftDiv = createDiv(leftContent);
      const rightDiv = createDiv(rightContent);

      wrapper.append(leftDiv, rightDiv);
      section.append(wrapper);
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  readLayoutMeta(main);
  decorateSections(main);
  decorateBlocks(main);
  buildLayoutContainer(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
