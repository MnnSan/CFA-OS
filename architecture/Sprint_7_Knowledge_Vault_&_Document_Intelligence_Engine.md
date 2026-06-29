
Sprint 7
Knowledge Vault & Document Intelligence Engine

That immediately tells everyone

This isn't Dropbox.

This is an intelligence layer.

What should be added

Here are the things Gemini completely missed.

1. Asset Repository

Right now

ResourceRepository

is too weak.

Create

AssetRepository

Everything becomes an asset.

PDF

Image

Markdown

Text

CSV

Excel

Video

Audio

Web link

NotebookLM export

Future proof.

2. Document Intelligence Service

Not OCR.

Not parsing.

A full service.

DocumentIntelligenceService

Responsibilities

extract text

clean text

create chunks

detect headings

extract tables

extract formulas

detect LOS references

detect reading references

extract glossary

calculate statistics

Later

AI plugs in here.

3. OCR Service

Separate.

OCRService

Because OCR is optional.

Sometimes

PDF

↓

text exists

↓

skip OCR

Sometimes

Scanned page

↓

OCR

↓

Document Intelligence

4. Chunk Engine

Very important.

Never store giant PDFs.

Instead

PDF

↓

page

↓

paragraph

↓

chunk

↓

Knowledge Graph

Later

NotebookLM

RAG

Vector Search

all become trivial.

5. Background Processing Queue

Very important.

Uploading

100 MB

must NEVER freeze React.

Instead

Upload

↓

Queue

↓

Worker

↓

Parsing

↓

Chunking

↓

OCR

↓

Graph

6. Asset Linking Engine

Imagine uploading

Reading 17.pdf

The engine detects

Reading 17

↓

Fixed Income

↓

LOS 17a

↓

Formula A

↓

Formula B

↓

Notes

Everything links automatically.

7. Semantic Metadata

Every asset stores

topics

keywords

LOS ids

difficulty

estimated study time

pages

reading

subject

language

confidence

version

8. Preview Engine

Instead of

Download

Create

Preview

Inside app.

PDF

Image

Markdown

Text

No download needed.

9. Reading Progress

This is HUGE.

Every PDF

0%

15%

40%

72%

100%

Automatically remembered.

Exactly like Kindle.

10. Highlights

Future ready.

Allow

Highlight

Underline

Bookmark

Comments

Sticky Notes

11. Deep Search

Not filename search.

Search

Duration

Returns

Formula

Notes

PDF paragraph

LOS

Resource

Everything.

12. Resource Timeline

Every asset remembers

uploaded

opened

edited

reviewed

linked

annotated

Later

AI uses this.

13. Recently Used

Dashboard widget

Continue Reading

Exactly like Kindle.

14. Knowledge Coverage

If Reading 18 has

No PDF

No Notes

No Formula

Dashboard says

Coverage

42%

You instantly know where gaps exist.

15. Dashboard Integration

Dashboard should gain

Recent Documents

Continue Reading

Recently Annotated

Weak Reading Resources

Suggested Reading

Unread Documents

Today's PDFs

16. Search becomes universal

Instead of

Search

↓

Curriculum

Now

Universal Search

returns

Subject

Reading

LOS

Formula

Document

Image

Note

Study Session

Calendar

Resource

Everything.

17. Architecture

New services

AssetRepository

IndexedDBService

DocumentIntelligenceService

OCRService

DocumentChunkService

AssetLinkingService

AssetPreviewService

BackgroundProcessingQueue

AssetSearchService

18. Knowledge Graph additions

New node

Asset

New edges

CONTAINS_TEXT

CONTAINS_IMAGE

LINKED_TO_READING

LINKED_TO_LOS

EXTRACTED_FORMULA

REFERENCED_BY_NOTE

VIEWED_IN_SESSION

ANNOTATED_BY

19. Future AI Hooks

Don't implement AI yet.

Only placeholders.

AI Summary

AI Quiz

AI Flashcards

AI Misconceptions

AI Mindmap

AI Explain Like I'm 5

NotebookLM Link

Embedding ID

Vector ID

Chunk ID

My recommended Sprint 7 storyline

If Sprint 6 taught the system how to understand formulas, Sprint 7 should teach it how to understand your study materials.

By the end of Sprint 7, the application should no longer behave like a collection of pages with uploaded files. It should behave like a personal CFA knowledge vault where every PDF, image, note, formula, and future AI artifact becomes a connected knowledge asset. Uploading a document should no longer mean "store this file." It should mean "ingest this knowledge into my learning system."

The architecture should introduce a dedicated Asset Repository backed by IndexedDB, a background document-processing pipeline, chunking services, OCR placeholders, semantic metadata extraction, and automatic linkage into the Knowledge Graph. Every uploaded asset should become a first-class node connected to Subjects, Readings, LOS, Formulas, Notes, Study Sessions, and future AI-generated content.

From the candidate's perspective, Sprint 7 should deliver obvious value. The Resource Library evolves into a Knowledge Vault with drag-and-drop uploads, document previews, reading progress, recent documents, automatic curriculum linking, universal search across every knowledge asset, and dashboard widgets such as Continue Reading, Recently Used Documents, Suggested Resources, and Knowledge Coverage. The infrastructure should also include extensibility points for future AI summarization, semantic search, NotebookLM integration, flashcard generation, vector embeddings, and intelligent revision workflows without requiring architectural redesigns later.
