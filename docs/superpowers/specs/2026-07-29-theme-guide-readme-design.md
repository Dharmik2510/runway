# Runway — Theme, Guide & README Design

Date: 2026-07-29

## Decisions

- Visual direction: refresh both themes, keep calm money-tool personality (Approach 2)
- Guide: `/guide` via header link (not a fourth nav tab)
- Theme default: **light**; toggle persists to `localStorage`

## Theme

CSS tokens on `:root` (light) and `[data-theme="dark"]`: `bg`, `surface`, `text`, `muted`, `accent`, `danger`, `border`, `nav-active`, `on-accent`, `track`, `marker`.

ThemeProvider applies `data-theme` on `<html>`; inline boot script prevents flash. Accent stays amber; danger stays red for shortfalls only. DM Sans unchanged.

## Guide

Plain-language sections: what Runway is, who it’s for, what an advance is, Today / Decide / Proof usage, demo disclaimer.

## UI polish

Replace hardcoded white-alpha borders and `#0A0A0B` button text with tokens. Cards use surface + border. No new product logic.

## README

Expanded pitch, benefits, screen tour, quick start, offline/synthetic disclaimer.
