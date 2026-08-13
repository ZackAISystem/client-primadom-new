# Project Page Split Map

Current live test route:
/primadom/project-page/

Current working partial:
project_page_raw.html

Target partials:
01. header.html
02. hero.html
03. answer_details.html
04. buyer_fit_logic.html
05. decision_cards.html
06. location.html
07. trust_faq_cta.html
08. lead_modal.html
09. scripts.html

Target CSS:
static/css/primadom/page-project.css
static/css/primadom/project/01-header.css
static/css/primadom/project/02-hero.css
static/css/primadom/project/03-content-cards.css
static/css/primadom/project/04-llm-blocks.css
static/css/primadom/project/05-modal.css
static/css/primadom/project/06-footer.css
static/css/primadom/project/99-responsive.css

Rule:
Do not touch static/css/main.css during this migration.

Important:
The existing production project hero partial already contains useful Hugo data binding:
- slug / project_key lookup
- name
- developer
- location
- price
- gallery
- ask hints

Reuse that dynamic logic when moving hero.html.
