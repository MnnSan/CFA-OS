**Sprint 6 should be the first sprint where the user feels "Wow, this is becoming an actual CFA operating system."**

That changes how we should think about it.

---

# The Philosophy of Sprint 6

Think of your application as three layers.

<pre class="overflow-visible! px-0!" data-start="523" data-end="1047"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>──────────────────────────────────────────────</span><br/><br/><span>          USER EXPERIENCE</span><br/><br/><span> Dashboard</span><br/><span> Curriculum</span><br/><span> Notes</span><br/><span> Formula Cards</span><br/><span> Search</span><br/><span> Recommendations</span><br/><br/><span>──────────────────────────────────────────────</span><br/><br/><span>        KNOWLEDGE INTELLIGENCE</span><br/><br/><span> Knowledge Graph</span><br/><span> Formula Engine</span><br/><span> Query Engine</span><br/><span> Recommendation Engine</span><br/><span> Analytics</span><br/><br/><span>──────────────────────────────────────────────</span><br/><br/><span>           DATA ENGINE</span><br/><br/><span> Repositories</span><br/><span> EventBus</span><br/><span> Snapshot Builder</span><br/><span> Graph Builder</span><br/><span> Persistence</span><br/><span> IndexedDB (later)</span><br/><br/><span>──────────────────────────────────────────────</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

Until Sprint 5.6 you've only been improving the bottom two layers.

The top layer barely changed.

Sprint 6 should finally expose everything you've already built.

---

# The Goal

Instead of saying

> Build a Formula Engine

the goal should become

> **Expose the Knowledge Engine through Formula Intelligence.**

That is a huge difference.

The Formula Engine becomes the **first window into the semantic graph.**

---

# The User Journey

Imagine yourself studying.

Instead of today's workflow

<pre class="overflow-visible! px-0!" data-start="1548" data-end="1609"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Dashboard</span><br/><br/><span>↓</span><br/><br/><span>Open Reading</span><br/><br/><span>↓</span><br/><br/><span>Read Formula</span><br/><br/><span>↓</span><br/><br/><span>Close</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

The new workflow becomes

<pre class="overflow-visible! px-0!" data-start="1637" data-end="1902"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Dashboard</span><br/><br/><span>↓</span><br/><br/><span>Today's Mission</span><br/><br/><span>↓</span><br/><br/><span>Suggested Formula</span><br/><br/><span>↓</span><br/><br/><span>Open Formula</span><br/><br/><span>↓</span><br/><br/><span>Understand Variables</span><br/><br/><span>↓</span><br/><br/><span>Understand Assumptions</span><br/><br/><span>↓</span><br/><br/><span>See Connected LOS</span><br/><br/><span>↓</span><br/><br/><span>Open Notes</span><br/><br/><span>↓</span><br/><br/><span>Open Resources</span><br/><br/><span>↓</span><br/><br/><span>Practice</span><br/><br/><span>↓</span><br/><br/><span>Mark Mastered</span><br/><br/><span>↓</span><br/><br/><span>Dashboard Updates</span><br/><br/><span>↓</span><br/><br/><span>Knowledge Graph Updates</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

Everything becomes connected.

---

# Architecture Vision

<pre class="overflow-visible! px-0!" data-start="1963" data-end="2880"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>                      USER</span><br/><br/><span>                        │</span><br/><br/><span>                        ▼</span><br/><br/><span>                Formula Card</span><br/><br/><span>                        │</span><br/><br/><span>        ┌───────────────┼────────────────┐</span><br/><br/><span>        ▼               ▼                ▼</span><br/><br/><span> Variables         Strategic Notes   Formula Metadata</span><br/><br/><span>        │               │                │</span><br/><br/><span>        └───────────────┼────────────────┘</span><br/><br/><span>                        ▼</span><br/><br/><span>              Knowledge Graph Queries</span><br/><br/><span>                        │</span><br/><br/><span>────────────────────────────────────────────────────</span><br/><br/><span>Related LOS</span><br/><br/><span>Related Readings</span><br/><br/><span>Related Notes</span><br/><br/><span>Related Resources</span><br/><br/><span>Sibling Formulae</span><br/><br/><span>Prerequisite Formulae</span><br/><br/><span>Practice History</span><br/><br/><span>Confidence History</span><br/><br/><span>Knowledge Density</span><br/><br/><span>────────────────────────────────────────────────────</span><br/><br/><span>                        │</span><br/><br/><span>                        ▼</span><br/><br/><span>                  Graph Snapshot</span><br/><br/><span>                        │</span><br/><br/><span>                        ▼</span><br/><br/><span>                  Immutable Graph</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

Notice something.

The Formula Card isn't just rendering math anymore.

It becomes a portal into your entire knowledge base.

---

# The New Formula Card

Today it is basically

<pre class="overflow-visible! px-0!" data-start="3060" data-end="3102"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Equation</span><br/><br/><span>↓</span><br/><br/><span>Variables</span><br/><br/><span>↓</span><br/><br/><span>Nuances</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

I would redesign it mentally like this

<pre class="overflow-visible! px-0!" data-start="3144" data-end="3862"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>────────────────────────────</span><br/><br/><span>Grinold Kroner Model</span><br/><br/><span>────────────────────────────</span><br/><br/><span>Equation</span><br/><br/><span>────────────────────────────</span><br/><br/><span>Variables</span><br/><br/><span>────────────────────────────</span><br/><br/><span>Strategic Assumptions</span><br/><br/><span>────────────────────────────</span><br/><br/><span>Exam Pitfalls</span><br/><br/><span>────────────────────────────</span><br/><br/><span>Related LOS</span><br/><br/><span>LOS 4.a</span><br/><br/><span>LOS 4.b</span><br/><br/><span>────────────────────────────</span><br/><br/><span>Related Notes</span><br/><br/><span>Tax Notes</span><br/><br/><span>Market Notes</span><br/><br/><span>────────────────────────────</span><br/><br/><span>Resources</span><br/><br/><span>Curriculum</span><br/><br/><span>Schweser</span><br/><br/><span>Notebook</span><br/><br/><span>────────────────────────────</span><br/><br/><span>Practice</span><br/><br/><span>15 Questions</span><br/><br/><span>78%</span><br/><br/><span>────────────────────────────</span><br/><br/><span>Confidence</span><br/><br/><span>★★★☆☆</span><br/><br/><span>────────────────────────────</span><br/><br/><span>Mastery Checklist</span><br/><br/><span>☐ Memorized</span><br/><br/><span>☐ Understand Variables</span><br/><br/><span>☐ Know Assumptions</span><br/><br/><span>☐ Know Limitations</span><br/><br/><span>☐ Can Apply</span><br/><br/><span>────────────────────────────</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

That is an intelligence system.

---

# Knowledge Graph Finally Becomes Visible

Right now the graph exists...

...but nobody knows it exists.

Imagine clicking

<pre class="overflow-visible! px-0!" data-start="4026" data-end="4042"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Duration</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

Instead of seeing

<pre class="overflow-visible! px-0!" data-start="4063" data-end="4078"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Formula</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

you see

<pre class="overflow-visible! px-0!" data-start="4089" data-end="4254"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Duration</span><br/><br/><span>Connected to</span><br/><br/><span>Reading 12</span><br/><br/><span>↓</span><br/><br/><span>LOS 12.a</span><br/><br/><span>↓</span><br/><br/><span>Study Note</span><br/><br/><span>↓</span><br/><br/><span>Curriculum PDF</span><br/><br/><span>↓</span><br/><br/><span>Schweser</span><br/><br/><span>↓</span><br/><br/><span>Mock Questions</span><br/><br/><span>↓</span><br/><br/><span>3 Practice Sessions</span><br/><br/><span>↓</span><br/><br/><span>Confidence</span><br/><br/><span>2/5</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

That is why you built a semantic graph.

---

# Dashboard Evolution

Today's dashboard is mostly statistics.

<pre class="overflow-visible! px-0!" data-start="4366" data-end="4410"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Countdown</span><br/><br/><span>Hours</span><br/><br/><span>Streak</span><br/><br/><span>Completion</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

Useful.

But passive.

Sprint 6 should make it intelligent.

Imagine opening your dashboard.

<pre class="overflow-visible! px-0!" data-start="4506" data-end="4929"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>────────────────────────────</span><br/><br/><span>Today's Mission</span><br/><br/><span>Reading 19</span><br/><br/><span>────────────────────────────</span><br/><br/><span>Recommended Formula</span><br/><br/><span>Singer-Terhaar</span><br/><br/><span>Reason</span><br/><br/><span>Low confidence</span><br/><br/><span>Not revised</span><br/><br/><span>Appears in next mission</span><br/><br/><span>────────────────────────────</span><br/><br/><span>Weak Formulae</span><br/><br/><span>3</span><br/><br/><span>────────────────────────────</span><br/><br/><span>Knowledge Health</span><br/><br/><span>87%</span><br/><br/><span>────────────────────────────</span><br/><br/><span>Coverage</span><br/><br/><span>42%</span><br/><br/><span>────────────────────────────</span><br/><br/><span>Formula Mastery</span><br/><br/><span>68%</span><br/><br/><span>────────────────────────────</span><br/></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

Now the dashboard is actively coaching you.

---

# Graph Queries Become User Features

You already built

<pre class="overflow-visible! px-0!" data-start="5038" data-end="5180"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>findShortestPath()</span><br/><br/><span>findRelatedNotes()</span><br/><br/><span>findRelatedResources()</span><br/><br/><span>findDependentLOS()</span><br/><br/><span>findSiblingReadings()</span><br/><br/><span>findWeakKnowledgeClusters()</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

Expose them.

The user shouldn't know these are graph algorithms.

They should simply experience them.

<pre class="overflow-visible! px-0!" data-start="5286" data-end="5398"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Related Formulae</span><br/><br/><span>Recommended Next Formula</span><br/><br/><span>Previous Formula</span><br/><br/><span>Dependent LOS</span><br/><br/><span>Sibling Reading</span><br/><br/><span>Study Path</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

Those are graph queries disguised as UX.

---

# Formula Search

Right now search is mostly textual.

Sprint 6 should make formulas searchable.

Example

User types

<pre class="overflow-visible! px-0!" data-start="5566" data-end="5582"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>duration</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

Results

<pre class="overflow-visible! px-0!" data-start="5593" data-end="5683"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Macaulay</span><br/><br/><span>Modified</span><br/><br/><span>Effective</span><br/><br/><span>Spread Duration</span><br/><br/><span>Key Rate Duration</span><br/><br/><span>Dollar Duration</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

Search

<pre class="overflow-visible! px-0!" data-start="5693" data-end="5710"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>inflation</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

Results

<pre class="overflow-visible! px-0!" data-start="5721" data-end="5781"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Fisher</span><br/><br/><span>Singer-Terhaar</span><br/><br/><span>Real Return</span><br/><br/><span>Expected Return</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

This uses all the metadata you've already built.

---

# Formula Mastery Engine

Instead of

<pre class="overflow-visible! px-0!" data-start="5876" data-end="5890"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Reveal</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

I would create mastery progression.

<pre class="overflow-visible! px-0!" data-start="5929" data-end="6084"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Formula</span><br/><br/><span>↓</span><br/><br/><span>Understand Equation</span><br/><br/><span>↓</span><br/><br/><span>Understand Variables</span><br/><br/><span>↓</span><br/><br/><span>Understand Assumptions</span><br/><br/><span>↓</span><br/><br/><span>Understand Limitations</span><br/><br/><span>↓</span><br/><br/><span>Can Solve Questions</span><br/><br/><span>↓</span><br/><br/><span>Mastered</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

Each step

↓

EventBus

↓

Repository

↓

Graph

↓

Dashboard

↓

Analytics

Everything becomes synchronized.

---

# Knowledge Health Dashboard

You already calculate

<pre class="overflow-visible! px-0!" data-start="6255" data-end="6318"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Coverage</span><br/><br/><span>Weak Areas</span><br/><br/><span>Disconnected Nodes</span><br/><br/><span>Health Score</span><br/></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

Use it.

<pre class="overflow-visible! px-0!" data-start="6329" data-end="6659"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Knowledge Health</span><br/><br/><span>────────────────────</span><br/><br/><span>Coverage</span><br/><br/><span>61%</span><br/><br/><span>────────────────────</span><br/><br/><span>Weak Subjects</span><br/><br/><span>Behavioral Finance</span><br/><br/><span>Private Wealth</span><br/><br/><span>Fixed Income</span><br/><br/><span>────────────────────</span><br/><br/><span>Weak Formulae</span><br/><br/><span>12</span><br/><br/><span>────────────────────</span><br/><br/><span>Orphan Notes</span><br/><br/><span>4</span><br/><br/><span>────────────────────</span><br/><br/><span>Resources Missing</span><br/><br/><span>8</span><br/><br/><span>────────────────────</span><br/><br/><span>Overall</span><br/><br/><span>88%</span><br/><br/><span>────────────────────</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

Now your graph becomes visible.

---

# Formula Timeline

Imagine opening

<pre class="overflow-visible! px-0!" data-start="6736" data-end="6752"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Duration</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

You see

<pre class="overflow-visible! px-0!" data-start="6763" data-end="6928"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>June 18</span><br/><br/><span>Studied</span><br/><br/><span>Confidence 2</span><br/><br/><span>──────────────────</span><br/><br/><span>June 22</span><br/><br/><span>Practiced</span><br/><br/><span>Confidence 3</span><br/><br/><span>──────────────────</span><br/><br/><span>June 28</span><br/><br/><span>Mastered</span><br/><br/><span>Confidence 5</span><br/><br/><span>──────────────────</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

Beautiful.

And almost free because you already track sessions.

---

# Tiny Knowledge Graph Visualizer

Nothing crazy.

Just

<pre class="overflow-visible! px-0!" data-start="7057" data-end="7237"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>            Formula</span><br/><br/><span>               │</span><br/><br/><span>        ┌──────┼──────┐</span><br/><br/><span>        ▼      ▼      ▼</span><br/><br/><span>     Reading   LOS   Notes</span><br/><br/><span>               │</span><br/><br/><span>               ▼</span><br/><br/><span>          Resources</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

Later

Sprint 10

this becomes

<pre class="overflow-visible! px-0!" data-start="7271" data-end="7304"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"><code><span>Entire Knowledge Explorer</span></code></pre></div></div></div></div></div></div></div></div></div><div class=""><div class=""></div></div></div></div></div></div></pre>

---

# Performance Goals

Do not sacrifice everything you've optimized.

The following rules stay sacred:

* Immutable graph snapshots.
* Snapshot hashing to eliminate redundant builds.
* Event-driven synchronization only.
* No timer-triggered re-renders.
* Formula interactions isolated to their own components.
* Graph compile time remains under 5 ms.
* Zero `any` types.
* Zero unnecessary React re-renders.

A fast application that becomes slow after adding features is just a very elaborate demonstration of entropy. Humans call that "version 2.0."

---

# My final Sprint 6 roadmap

I would divide Sprint 6 into six deliverables.

## Part 1

Formula Rendering

* KaTeX
* inline math
* display math
* Formula Repository expansion

---

## Part 2

Interactive Formula Cards

* Equation
* Variables
* Strategic Nuance
* Mastery

---

## Part 3

Knowledge Graph Integration

Use existing GraphQueries.

Show

* Related LOS
* Notes
* Resources
* Readings
* Related Formulae
* Density
* Confidence

---

## Part 4

Dashboard Intelligence

New widgets

* Recommended Formula
* Weak Formulae
* Formula Mastery
* Knowledge Health
* Coverage

---

## Part 5

Curriculum Integration

Every Reading

↓

Expandable Formula section

↓

Connected Notes

↓

Resources

↓

Confidence

↓

Mastery

---

## Part 6

Performance

Maintain

* <5 ms graph compile
* isolated rendering
* zero timer re-renders
* EventBus events
* immutable graph
* snapshot rebuilds only when hashes change

# Implementation Plan: Sprint 6 - Formula Intelligence Engine

## 1. Context & Objective

We have successfully hardened the system's infrastructure in Sprint 4.5, establishing an event-driven Repository architecture and a global EventBus. However, the frontend remains a passive rendering of the initial layout shell.

The goal of this sprint is to shift completely to user-visible functionality by building out the **Formula Intelligence Engine**. We will implement native, high-performance math notation rendering, an interactive three-part discovery layout, and embed formula cards directly into the active UI nodes where you study.

---

## 2. Core Functional Requirements

### A. Core Mathematical Rendering Stack

- Integrate a robust math typesetting engine (such as KaTeX via standard lightweight React wrappers) capable of rendering complex expressions seamlessly without layout shifts (CLS).
- Support both `$inline$` and `$$display$$` mathematical notation.

### B. The 3-Part Interactive Formula Component (`<FormulaCard />`)

Level III tests analytical interpretation and structural assumptions over rote calculation. The component must manage an internal state machine displaying three progressive tiers:

1. **Tier 1: The Equation** -> The clean mathematical expression (e.g., Grinold-Kroner or Singer-Terhaar).
2. **Tier 2: The Variables Breakdown** -> An interactive or expandable glossary mapping every coefficient and variable input to its definitions.
3. **Tier 3: Level III Strategic Nuance** -> Direct text bullet points highlighting the qualitative constraints, core institutional assumptions, and conditions under which the formula fails.

### C. Seeding Production Level III Equations

Update the `FormulaRepository` static catalog (`INITIAL_FORMULAS`) with high-fidelity, real Level III equations including:

- **Grinold-Kroner Model:**
  $$
  E(R_e) = \frac{D_1}{P_0} + i + g - \Delta S + \Delta(P/E)
  $$
- **Singer-Terhaar Model:** Fully split out into global systematic risk premium and illiquidity premium segments.
- **Active Share, Information Ratio, and Macro Attribution equations.**

---

## 3. UI/UX Changes (User-Visible Enhancements)

### A. Dashboard Integration: "Today's Mission" Context Cards

- Update the **Today's Mission** container on the Dashboard. When a mission is computed, query the `FormulaRepository` to see if the active reading owns any formulas.
- If formulas exist, display them as interactive micro-cards directly inside the workspace. Clicking a micro-card should slide open a dedicated overlay showing its 3-part progression.

### B. Curriculum View Integration: Click-to-Reveal Nodes

- Inside the **Curriculum database** view, expand the Reading rows (e.g., Reading 12 or 13) to list any associated formulas.
- Render them as high-contrast minimalist blocks matching our Swiss-style layout. Let candidates practice active recall directly inline by revealing variables and strategic nuances on click.

### C. Event Bus Integration

- Interacting with a formula card must publish analytical actions to our `EventBus`:
  * Revealing a nuance bullet points should fire a `FormulaRevealed` event.
  * Checking an inline mastery box should fire a `FormulaMastered` event, which the `AnalyticsService` will capture to dynamically update your topic confidence profiles.

---

## 4. Technical Constraints & Code Quality

- **Zero Type Alterations:** Do not use `any`. All props, event payloads, and repository queries must map cleanly to our existing types.
- **Render Optimization:** Use strict component isolation so that toggling open an inline formula equation breakdown does not trigger re-render cascades in the active study session timer tracking ticks.
- **Aesthetic:** Maintain our dark-mode Swiss-design style guidelines—monospaced fonts for structural data markers, precise typography scales, high contrast ratios, and no unnecessary decorative colors.

---

## 5. Verification Plan

- **Build Check:** Execute `npm run build` to verify compiling completes with zero errors or linter warnings.
- **Visual Validation:** Confirm that math equations render cleanly as formatted textbook math notation on `localhost` rather than raw string tokens.
- **Interaction Check:** Verify that opening one formula card's progressive panel does not globally expand other equations in the list.

# Final Sprint 6 Vision

I would redefine Sprint 6 as follows:

> **Sprint 6: Formula Intelligence & Knowledge Navigation Engine**

Its mission is not merely to render mathematical equations. It is to expose the semantic knowledge graph through an intelligent, interactive formula system that transforms every formula into the central navigation hub of the CFA learning experience.

The sprint should deliver six tightly integrated capabilities:

1. **Production Formula Engine** : KaTeX rendering, comprehensive CFA Level III formula repository, inline and display math, and structured metadata.
2. **Interactive Formula Intelligence Cards** : Progressive learning interface with Equation → Variables → Strategic Nuances → Exam Pitfalls → Mastery Checklist.
3. **Knowledge Graph Integration** : Every formula becomes a gateway to connected Learning Outcome Statements, Readings, Notes, Resources, Practice History, Confidence Scores, and Related Formulae using the existing GraphQueries infrastructure.
4. **Intelligent Dashboard** : Introduce adaptive recommendations such as Recommended Formula Today, Weak Formulae, Formula Mastery, Knowledge Health, and Coverage metrics powered by the semantic graph.
5. **Curriculum & Search Integration** : Embed expandable formula sections directly into the Curriculum Database, enable semantic formula search, and provide graph-powered navigation between related concepts.
6. **Event-Driven Analytics & Performance** : Every mastery action publishes domain events, updates repositories and graph snapshots, refreshes dashboard analytics, and preserves the performance guarantees achieved in Sprint 5, including immutable snapshots, hash-based rebuild skipping, isolated rendering, and sub-5 ms graph compilation.
