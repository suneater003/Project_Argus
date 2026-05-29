# 🧠 Project Argus: Engineering Reflection & AI Limitations

Building Project Argus was an exercise in balancing the unstructured nature of human conversation with the strict requirements of enterprise software. While the platform successfully automates MEDDIC extraction and deal intelligence, treating the underlying Large Language Model (LLM) as a "magic bullet" is a dangerous trap. 

This document serves as a technical reflection on the prompt engineering decisions that shaped the system, the inherent limitations of the AI, and the specific edge cases where the pipeline breaks down.

---

## 🏗️ The Most Critical Prompt Engineering Decision
**LLMs are semantic engines, not calculators.** 

Early in development, I attempted to have the LLM calculate the final MEDDIC completeness percentage directly in its JSON response. This was a mistake. If the model found 5 out of 6 elements, it would often "hallucinate" the math, returning scores like `80%` or `100%` based purely on the semantic "vibe" of the transcript rather than actual arithmetic.

**The Solution: Deterministic Guardrails**
I completely stripped the LLM of its mathematical responsibilities. I refined the prompt to do exactly two things:
1. Extract the verbatim quote.
2. Assign a strict confidence string (`"High"`, `"Medium"`, `"Low"`, or `null`).

By returning this isolated, structured JSON to the React frontend, I shifted the actual calculation to bulletproof JavaScript logic. If the array has six "High" confidence flags, JavaScript calculates `(6/6) * 100` and renders `100%`. 

This decision was the turning point for the project. It ensures the UI metrics remain mathematically perfect and enterprise-grade, while leveraging the LLM purely for what it excels at: semantic reasoning.

---

## 🛑 Where the Machine Fails: MEDDIC Blindspots
Despite strict system prompts, LLMs still struggle with the subtle nuances of human-to-human sales dynamics. During testing, I identified three major failure points in the extraction pipeline:

### 1. The "Polite Deferral" Trap (Sentiment vs. Intent)
LLMs are generally trained to be helpful and optimistic, making them terrible at detecting polite professional brush-offs. 
* **The Scenario:** A customer says, *"Wow, this looks really interesting. We don't have budget right now, but we'll definitely keep you in mind for a Q4 rollout."*
* **The Failure:** A seasoned human rep knows this is a soft "No." The LLM, however, sees the phrase "Q4 rollout" and enthusiastically flags it as a highly confident **Decision Process** or **Timeline**. It struggles to separate surface-level sentiment from underlying buying intent.

### 2. Pronoun Ambiguity & The Missing "E"
The MEDDIC framework requires a concrete **Economic Buyer**. 
* **The Scenario:** A champion says, *"I love the product. Let me run this past my boss, he usually signs off on this kind of software."*
* **The Failure:** The AI correctly identifies that an Economic Buyer exists, but because no name was explicitly stated, it hits a roadblock. Depending on the temperature settings, the model will either fail the extraction entirely, or worse, hallucinate a name from a completely different part of the transcript just to fulfill the JSON schema.

### 3. Diarization Dependencies
The entire Argus intelligence pipeline assumes the upstream audio-to-text transcript is flawless. If the transcription service (e.g., Whisper, Deepgram) experiences a diarization failure—meaning it accidentally swaps Speaker 1 (the Rep) and Speaker 2 (the Customer)—the logic collapses. The LLM will confidently extract a massive **Pain** point or **Decision Criteria**, completely unaware that it was actually the sales rep talking, not the buyer.

---

## 📉 Unreliable Conversation Archetypes
You cannot force a complex enterprise framework onto a casual conversation. Project Argus produces highly unreliable data when analyzing the following call types:

* **The 15-Minute "Window Shopping" Call:** Applying MEDDIC to a top-of-funnel discovery call is like using a sledgehammer on a pushpin. Because there is no real Deal Process or Economic Buyer established yet, the LLM is forced to "reach" for data that simply isn't there, resulting in a dashboard full of low-confidence garbage data.
* **The Highly Technical Deep-Dive:** When a call involves a Sales Engineer and an IT Lead debating API latency, webhooks, and architecture for 45 minutes, the context window floods with jargon. The LLM gets lost in the technical weeds and often misses the underlying business **Metrics** or **Pain** completely.
* **The Multi-Buyer Free-For-All:** Calls with 4+ stakeholders (e.g., a champion, IT, legal, and procurement all in one Zoom room) confuse the model. The LLM struggles to attribute specific **Decision Criteria** to the correct individual, often blending conflicting requirements into a single, contradictory summary.

---

## 💡 Final Thoughts
Building Project Argus reinforced a crucial lesson in modern software development: creating a reliable AI application is rarely about having the perfect model. It is about designing a resilient, full-stack system that anticipates the model's failures, restricts its responsibilities, and gracefully handles edge cases before they reach the user interface.