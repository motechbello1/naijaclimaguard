"use client";

import { useEffect } from "react";
import { useLanguage } from "./LanguageProvider";
import { translatePlatformText } from "@/lib/i18n/translate-platform";

type Locale = Parameters<typeof translatePlatformText>[0];

type TranslatableAttr = "placeholder" | "title" | "aria-label";

const originalText = new WeakMap<Text, string>();
const originalAttrs = new WeakMap<HTMLElement, Partial<Record<TranslatableAttr, string>>>();

function shouldSkip(element: HTMLElement | null) {
  if (!element) return true;
  return Boolean(element.closest("[data-ncg-no-translate='true'],script,style,code,pre"));
}

function expectedFor(locale: Locale, source: string) {
  return locale === "en" ? source : translatePlatformText(locale, source);
}

function updateOriginalIfReactChanged(node: Text, locale: Locale) {
  const current = (node.textContent || "").trim();
  const stored = originalText.get(node);
  if (!current) return;
  if (!stored) {
    originalText.set(node, current);
    return;
  }
  const renderedFromStored = expectedFor(locale, stored);
  if (current !== stored && current !== renderedFromStored) {
    originalText.set(node, current);
  }
}

function translateTextNode(node: Text, locale: Locale) {
  const parent = node.parentElement;
  if (shouldSkip(parent)) return;

  const raw = node.textContent || "";
  const trimmed = raw.trim();
  if (!trimmed) return;

  updateOriginalIfReactChanged(node, locale);
  const source = originalText.get(node) || trimmed;
  const next = expectedFor(locale, source);
  if (trimmed === next) return;

  const leading = raw.match(/^\s*/)?.[0] || "";
  const trailing = raw.match(/\s*$/)?.[0] || "";
  node.textContent = `${leading}${next}${trailing}`;
}

function translateAttributes(element: HTMLElement, locale: Locale) {
  if (shouldSkip(element)) return;

  const stored = originalAttrs.get(element) || {};
  const attrs: TranslatableAttr[] = ["placeholder", "title", "aria-label"];

  for (const attr of attrs) {
    const current = element.getAttribute(attr);
    if (!current) continue;

    const prior = stored[attr];
    if (!prior) {
      stored[attr] = current;
    } else {
      const renderedFromPrior = expectedFor(locale, prior);
      if (current !== prior && current !== renderedFromPrior) stored[attr] = current;
    }

    const source = stored[attr] || current;
    const next = expectedFor(locale, source);
    if (current !== next) element.setAttribute(attr, next);
  }

  originalAttrs.set(element, stored);
}

function translateTree(root: ParentNode, locale: Locale) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    translateTextNode(current as Text, locale);
    current = walker.nextNode();
  }
  if (root instanceof HTMLElement) translateAttributes(root, locale);
  root.querySelectorAll<HTMLElement>("[placeholder],[title],[aria-label]").forEach((element) => translateAttributes(element, locale));
}

export default function PlatformTranslationBridge() {
  const { locale } = useLanguage();

  useEffect(() => {
    const apply = () => translateTree(document.body, locale);
    apply();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData" && mutation.target.nodeType === Node.TEXT_NODE) {
          translateTextNode(mutation.target as Text, locale);
        }
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text, locale);
          else if (node instanceof HTMLElement) translateTree(node, locale);
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [locale]);

  return null;
}
