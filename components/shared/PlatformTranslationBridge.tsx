"use client";

import { useEffect } from "react";
import { useLanguage } from "./LanguageProvider";
import { translatePlatformText } from "@/lib/i18n/translate-platform";

const ORIGINAL_TEXT = "data-ncg-original-text";
const ORIGINAL_PLACEHOLDER = "data-ncg-original-placeholder";
const ORIGINAL_TITLE = "data-ncg-original-title";
const ORIGINAL_ARIA = "data-ncg-original-aria";

function translateTextNode(node: Text, locale: Parameters<typeof translatePlatformText>[0]) {
  const parent = node.parentElement;
  if (!parent || parent.closest("[data-ncg-no-translate='true']")) return;
  const raw = node.textContent || "";
  const trimmed = raw.trim();
  if (!trimmed) return;
  const key = parent.getAttribute(ORIGINAL_TEXT) || trimmed;
  if (!parent.hasAttribute(ORIGINAL_TEXT)) parent.setAttribute(ORIGINAL_TEXT, key);
  const translated = translatePlatformText(locale, key);
  if (translated === key && locale !== "en") return;
  const leading = raw.match(/^\s*/)?.[0] || "";
  const trailing = raw.match(/\s*$/)?.[0] || "";
  node.textContent = `${leading}${translated}${trailing}`;
}

function translateAttributes(element: HTMLElement, locale: Parameters<typeof translatePlatformText>[0]) {
  if (element.closest("[data-ncg-no-translate='true']")) return;
  const attrs: Array<["placeholder" | "title" | "aria-label", string]> = [
    ["placeholder", ORIGINAL_PLACEHOLDER],
    ["title", ORIGINAL_TITLE],
    ["aria-label", ORIGINAL_ARIA],
  ];
  for (const [attr, originalAttr] of attrs) {
    const current = element.getAttribute(attr);
    if (!current) continue;
    const original = element.getAttribute(originalAttr) || current;
    if (!element.hasAttribute(originalAttr)) element.setAttribute(originalAttr, original);
    element.setAttribute(attr, translatePlatformText(locale, original));
  }
}

function translateTree(root: ParentNode, locale: Parameters<typeof translatePlatformText>[0]) {
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
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text, locale);
          else if (node instanceof HTMLElement) translateTree(node, locale);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [locale]);

  return null;
}
