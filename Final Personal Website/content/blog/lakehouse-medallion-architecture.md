---
title: "Designing a Medallion Architecture that survives 120M+ rows"
date: "2026-03-14"
excerpt: "Lessons from building a Bronze/Silver/Gold pipeline for multi-city bike-share data on Databricks — what actually mattered at scale."
tags: ["Databricks", "Data Engineering", "Delta Lake"]
readTime: "6 min read"
---

When I set out to build a production pipeline for multi-city bike-share data, the goal was simple on paper: ingest raw trip data, clean it, and make it queryable for analytics. In practice, doing this well for 120M+ rows surfaced a handful of lessons that only show up at scale.

## Start with the contract, not the code

Before writing a single notebook, I wrote down what "done" looked like for each layer:

- **Bronze** — raw, append-only, schema-on-read
- **Silver** — deduplicated, typed, conformed to a shared schema across cities
- **Gold** — aggregated, business-ready tables for dashboards and downstream consumers

Having that contract meant every table had a clear job, which made debugging dramatically easier later.

## Partitioning + Z-Order beat Liquid Clustering here

I benchmarked Liquid Clustering against a more traditional Partitioning + Z-Order strategy on the fact tables. Liquid Clustering is excellent for evolving query patterns, but for this workload — with a stable, well-understood set of filter columns — Partitioning + Z-Order consistently outperformed it on scan times.

The takeaway isn't "Liquid Clustering is worse." It's that table layout decisions should be driven by actual query patterns, not by whichever feature is newest.

## CI/CD makes the pipeline boring — in a good way

Wiring up Databricks Asset Bundles with GitHub Actions meant every change to the pipeline went through the same review and deploy path as any other piece of software. That turned "someone edited a notebook in prod" into a non-event.

## What I'd do differently

If I were starting over, I'd invest earlier in data quality checks between Bronze and Silver. Catching malformed records at the boundary is far cheaper than discovering them three joins downstream in a Gold table a stakeholder is already using.
