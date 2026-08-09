"use client";

import { useEffect } from "react";
import { useLanguage } from "./LanguageProvider";
import { translatePlatformText } from "@/lib/i18n/translate-platform";

type Locale = Parameters<typeof translatePlatformText>[0];

const originalText = new WeakMap<Text, string>();
const originalAttrs = new WeakMap<HTMLElement, Partial<Record<"placeholder" | "title" | "aria-label", string>>>();

function shouldSkip(element: HTMLElement | null) {
  if (!element) return true;
  return Boolean(element.closest("[data-ncg-no-translate='true'],script,style,code,pre"));
}

function translateTextNode(node: Text, locale: Locale) {
  const parent = node.parentElement;
  if (shouldSkip(parent)) return;

  const raw = node.textContent || "";
  const trimmed = raw.trim();
  if (!trimmed) return;

  if (!originalText.has(node)) originalText.set(node, trimmed);
  const source = originalText.get(node) || trimmed;
  const translated = translatePlatformText(locale, source);
  const leading = raw.match(/^\s*/)?.[0] || "";
  const trailing = raw.match(/\s*$/)?.[0] || "";
  const next = locale === "en" ? source : translated;

  if (trimmed !== next) node.textContent = `${leading}${next}${trailing}`;
}

function translateAttributes(element: HTMLElement, locale: Locale) {
  if (shouldSkip(element)) return;

  const stored = originalAttrs.get(element) || {};
  const attrs: Array<"placeholder" | "title" | "aria-label"> = ["placeholder", "title", "aria-label"];

  for (const attr of attrs) {
    const current = element.getAttribute(attr);
    if (!current) continue;
    if (!stored[attr]) stored[attr] = current;
    const source = stored[attr] || current;
    element.setAttribute(attr, locale === "en" ? source : translatePlatformText(locale, source));
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
          const node = mutation.target as Text;
          if (!originalText.has(node)) originalText.set(node, (node.textContent || "").trim());
          translateTextNode(node, locale);
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
