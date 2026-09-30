"""Build the six static preview pages from a shared shell and repeated entries."""
from pathlib import Path
ROOT = Path(__file__).resolve().parent

def icon(name):
    return f'<i data-lucide="{name}" aria-hidden="true"></i>'

def link(href, label, primary=False):
    style = 'action primary' if primary else 'action'
    return f'<a class="{style}" href="{href}">{label} {icon("arrow-right")}</a>'

def back(href, label):
    return f'<a class="back" href="{href}">{icon("arrow-left")} {label}</a>'

def project_entry(title, description, anchor):
    return f'''<article class="project-entry"><div><h3><a href="project.html#{anchor}">{title}</a></h3><span class="status">Project placeholder</span></div>
    <div><p>{description}</p><div class="entry-meta"><span class="category">Software project</span>{link('project.html#'+anchor, 'View layout')}</div></div></article>'''

def writing_rows():
    entries = [('Essay', 'Your first essay title', 'essay'), ('Field note', 'A note from something you built', 'field-note'), ('Reflection', 'An idea worth exploring', 'reflection')]
    return '<div class="writing-list">' + ''.join(f'<article class="writing-row"><span class="category">{kind}</span><h3><a href="article.html?entry={slug}">{title}</a></h3><span class="status">Content pending</span></article>' for kind,title,slug in entries) + '</div>'

def shell(title, active, content):
    nav = ''.join(f'<a href="{slug}.html"' + (' aria-current="page"' if active == slug else '') + f'>{label}</a>' for slug,label in [('projects','Projects'),('writing','Writing'),('about','About')])
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{title} — Aaron</title><link rel="stylesheet" href="styles.css"><script defer src="vendor/rough-notation.js"></script><script defer src="vendor/lucide.js"></script><script defer src="preview.js"></script></head>
<body><a class="skip" href="#main">Skip to content</a><div class="preview-label"><strong>Design preview</strong><span>Project, article and biography content is pending.</span></div>
<div class="page"><header class="site-header"><a class="wordmark" href="index.html" aria-label="Aaron, home">aaron.</a><nav class="site-nav" aria-label="Main navigation">{nav}</nav></header><main id="main">{content}</main>
<footer class="site-footer"><p>Software development &amp; writing.</p><p class="closing">Always a work in progress.</p>{link('about.html#contact','Get in touch')}</footer></div></body></html>'''

first = project_entry('Your first project', 'A short description of the problem, what you built, and why it matters.', 'first-project')
second = project_entry('Your next project', 'Another piece of work, with space for the decisions and lessons behind it.', 'next-project')
home = f'''
<section class="intro" aria-labelledby="home-title"><div><h1 id="home-title">I <span data-highlight>build</span> software.<br>I <span data-highlight>write</span> things down.</h1><p class="lead">A notebook of projects, experiments,<br>and ideas worth keeping.</p><div class="actions">{link('projects.html','Explore my projects',True)}{link('writing.html','Read my writing')}</div></div><aside class="margin-note"><p>A little code.<br>A little curiosity.</p><small>The work, and the thinking behind it.</small></aside></section>
<section aria-labelledby="projects-title"><div class="section-title"><h2 id="projects-title">Selected <span data-underline>projects</span></h2>{link('projects.html','All projects')}</div><div class="projects-grid">{first}{second}</div></section>
<section class="section" aria-labelledby="writing-title"><div class="section-title"><h2 id="writing-title">Latest <span data-underline>writing</span></h2>{link('writing.html','All writing')}</div>{writing_rows()}</section>'''
projects = f'''
<div class="page-heading"><h1>The <span data-highlight>project</span> notebook.</h1><p class="lead">The work, the decisions, and what came next.</p></div>
<p class="index-note">{icon('info')} These are layout placeholders. Real project names, descriptions, and links will replace them.</p><div class="project-list">{first}{second}</div><p class="small-note">A place for the thinking, too.</p><div class="end-links">{link('writing.html','Explore the writing')}{link('about.html','About Aaron')}</div>'''
project = f'''
<div class="page-heading">{back('projects.html','All projects')}<h1 id="project-title">Your first <span data-highlight>project.</span></h1><p class="lead">A short description of the problem, what you built, and why it matters.</p><div class="reading-meta"><span>Case-study layout</span><span>Project details pending</span></div></div>
<div class="document-layout"><div class="prose"><p class="content-note">This is a case-study template. It contains no claimed results, screenshots, or technology choices.</p>
<section id="problem"><h2>The problem</h2><p>Describe who needed help, what was difficult, and what a useful outcome would look like. Add the real context behind this project.</p></section>
<section id="approach"><h2>The approach</h2><p>Explain the choices you made and the alternatives you considered. Keep the focus on what mattered to the person using it.</p></section>
<section id="evidence"><h2>What changed</h2><p>Add the result you can support with evidence. A real screenshot, demonstration, or repository link can go here when one is available.</p></section>
<section id="lessons"><h2>What I learned</h2><p>Describe what surprised you, what you would change, and what the next version needs.</p></section><div class="end-links">{link('projects.html','Back to projects')}{link('writing.html','Related thinking')}</div></div>
<aside class="side-index"><h2>In this entry</h2><nav aria-label="Case study sections"><a href="#problem">The problem</a><a href="#approach">The approach</a><a href="#evidence">What changed</a><a href="#lessons">What I learned</a></nav><p>Code and demo links will appear when provided.</p></aside></div>'''
writing = f'''
<div class="page-heading"><h1>Things worth <span data-highlight>writing down.</span></h1><p class="lead">Notes, essays, and ideas from the process.</p></div><p class="index-note">{icon('info')} Titles are placeholders. Open an entry to explore the reading layout.</p>{writing_rows()}
<div class="section"><h2>A little room for ideas.</h2><p class="lead">Longer essays and shorter notes share one quiet reading space.</p><p class="small-note">Always a work in progress.</p></div><div class="end-links">{link('projects.html','See the projects')}{link('about.html','About Aaron')}</div>'''
article = f'''
<div class="page-heading">{back('writing.html','All writing')}<h1 class="article-title" id="article-title">Your first <span data-highlight>essay title.</span></h1><div class="reading-meta"><span id="article-category">Essay</span><span>By Aaron</span><span>Content pending</span></div></div>
<div class="reading-column"><p class="content-note">Reading-layout preview. The passages below describe the content to add; they are not a published essay.</p><div class="prose"><p>Open with the question or observation that made this piece worth writing. Give the reader a reason to stay, in your own words.</p>
<section class="section"><h2>The central idea</h2><p>Develop one idea at a time. Ground it in something specific: an experience, a decision, or a detail you noticed while building.</p><p>Use a second paragraph when the thought needs more room. Keep the line length comfortable and let the page stay quiet around the writing.</p></section>
<div class="pull-note">Space for one thought<br>worth pausing on.</div><section><h2>What follows from it</h2><p>Close with what this changes, what remains uncertain, or the next question you want to explore. Add real sources where the writing needs them.</p></section></div><div class="end-links">{link('writing.html','Back to all writing')}{link('article.html?entry=field-note','Next entry layout')}</div></div>'''
about = f'''
<div class="page-heading"><h1>A little <span data-highlight>about me.</span></h1><p class="lead">I'm Aaron. This is a home for my software development and writing.</p></div><div class="document-layout"><div><div class="prose"><section><h2>The person behind the notebook</h2><p>Your biography goes here: the experiences that shape your work, the problems you care about, and what you want to explore next.</p><p class="content-note">Biography placeholder. No employer, location, experience, or availability is assumed.</p></section><section><h2>What you'll find here</h2><p>Projects, experiments, and ideas worth keeping. Start with the work, or spend a little time with the writing.</p><div class="actions">{link('projects.html','Browse projects')}{link('writing.html','Browse writing')}</div></section></div>
<section class="section" id="contact"><h2>Get in <span data-underline>touch.</span></h2><p class="lead">Contact details are still to be added.</p><div class="contact-placeholder">{icon('mail')}<div><strong>Email</strong><small>Address not provided</small></div><span class="status">Pending</span></div><div class="contact-placeholder">{icon('code-xml')}<div><strong>Code profile</strong><small>Profile link not provided</small></div><span class="status">Pending</span></div></section></div><aside class="side-index"><h2>A note on this preview</h2><p>The layout is ready for your story. Personal details and links stay blank until you supply them.</p></aside></div>'''
pages = [('index','Home','',home), ('projects','Projects','projects',projects), ('project','Project detail','projects',project), ('writing','Writing','writing',writing), ('article','Article','writing',article), ('about','About','about',about)]
for filename,title,active,content in pages:
    (ROOT / f'{filename}.html').write_text(shell(title,active,content))
print(f'Built {len(pages)} static pages.')
