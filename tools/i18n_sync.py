#!/usr/bin/env python3
"""Keeps the English version of the site in step with the Portuguese (tools/i18n.config.json).

Run from anywhere (paths are relative to the repo root, the folder above tools/):
    python3 tools/i18n_sync.py                  find new or changed Portuguese, tag it, translate it, save
    python3 tools/i18n_sync.py --dry-run        only report what it would do; change nothing
    python3 tools/i18n_sync.py --check          change nothing; exit 1 if any English is missing or out of date
    python3 tools/i18n_sync.py --export FILE    write what still needs English to FILE (JSON), to translate by hand
    python3 tools/i18n_sync.py --import FILE    read the English back from that FILE and save it
    options: --engine claude|deepl|none   --model MODEL (Claude model ID)   --retranslate KEY [KEY ...]

What it reads (the source files, not the live site: that way it can also write the keys back):
  - the 5 pages: every piece of visible Portuguese text and the alt / title / aria-label / placeholder
    attributes. Text with no key yet gets one (data-i18n, data-i18n-html, data-i18n-attr), the way
    js/i18n.js expects. The <head> belongs to tools/seo.py and is left alone.
  - js/events.js: every event's title, category, city, format, summary, description and highlights
    (English under events.item.<id>.<field>). English of events that no longer exist is removed.
  - the scripts' T("key", "Portuguese") calls (contact form, events, carousel).

How it knows the English is out of date: translations.json keeps a copy of the Portuguese each English
text was made from ("pt" section; tools/i18n-sources.json for events, so the page never shows an old copy).
When the Portuguese no longer matches that copy, the English is made again. English you corrected by hand
stays as long as its Portuguese doesn't change.

Translating (only what is new or changed is sent, so a run costs next to nothing):
  - claude: set ANTHROPIC_API_KEY. Uses the glossary and examples of the site's existing English, so the
    new text matches the old (British English, brand names untouched, HTML tags and {placeholders} kept).
  - deepl: set DEEPL_API_KEY (keys ending in ":fx" use the free endpoint).
  - no key: nothing is sent anywhere; --export / --import let you translate by hand or with any tool.
Text that should never be translated: add it to "keep" in tools/i18n.config.json, or put translate="no"
on its element in the HTML.

Standard library only (Python 3.8+). Git is the undo button: review `git diff` after a run.
"""
import argparse
import hashlib
import html
import json
import os
import pathlib
import re
import sys
import unicodedata
import urllib.error
import urllib.request
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONFIG = ROOT / "tools" / "i18n.config.json"

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
SKIP_TAGS = {"script", "style", "svg", "noscript", "template", "head", "code", "pre"}
INLINE_MARKUP = {"br", "strong", "em", "b", "u", "small", "mark", "sup", "sub", "a", "code"}   # a sentence with a link stays one piece
ATTRS = ["placeholder", "aria-label", "title", "alt", "aria-roledescription"]


# ---------------------------------------------------------------- HTML with source positions
class Node:
    __slots__ = ("tag", "attrs", "start", "sot_end", "end", "parent", "children", "text")

    def __init__(self, tag=None, attrs=None, start=0, sot_end=0, parent=None, text=None):
        self.tag, self.attrs, self.start, self.sot_end, self.parent = tag, attrs or [], start, sot_end, parent
        self.end, self.children, self.text = None, [], text

    def attr(self, name):
        for a, v in self.attrs:
            if a == name:
                return v if v is not None else ""
        return None


class _Parser(HTMLParser):
    def __init__(self, src):
        super().__init__(convert_charrefs=True)
        self.src, self.lines = src, [0] + [m.end() for m in re.finditer("\n", src)]
        self.root = Node("#root")
        self.stack = [self.root]

    def _off(self):
        line, col = self.getpos()
        return self.lines[line - 1] + col

    def handle_starttag(self, tag, attrs):
        s = self._off()
        n = Node(tag, attrs, s, s + len(self.get_starttag_text()), self.stack[-1])
        self.stack[-1].children.append(n)
        if tag not in VOID:
            self.stack.append(n)

    def handle_startendtag(self, tag, attrs):
        s = self._off()
        self.stack[-1].children.append(Node(tag, attrs, s, s + len(self.get_starttag_text()), self.stack[-1]))

    def handle_endtag(self, tag):
        s = self._off()
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                for n in self.stack[i:]:
                    if n.end is None:
                        n.end = s
                del self.stack[i:]
                return

    def handle_data(self, data):
        if any(n.tag in SKIP_TAGS for n in self.stack):
            return
        s = self._off()
        e = self.src.find("<", s)
        e = len(self.src) if e < 0 else e
        t = Node(None, None, s, e, self.stack[-1], text=html.unescape(self.src[s:e]))
        t.end = e
        self.stack[-1].children.append(t)


def parse(src):
    p = _Parser(src)
    p.feed(src)
    p.close()
    return p.root


def walk(n):
    yield n
    for c in n.children:
        yield from walk(c)


def ancestors(n):
    while n is not None:
        yield n
        n = n.parent


def norm(s):
    s = re.sub(r"<br\s*/?>", "<br>", s or "", flags=re.I)
    return re.sub(r"\s+", " ", s).strip()


def text_of(n):
    return "".join(c.text for c in walk(n) if c.tag is None)


def slug(s, words=6):
    s = unicodedata.normalize("NFKD", re.sub(r"<[^>]+>", " ", s)).encode("ascii", "ignore").decode().lower()
    return "-".join(re.findall(r"[a-z0-9]+", s)[:words]) or "text"


# ---------------------------------------------------------------- what counts as translatable
class Rules:
    def __init__(self, cfg):
        self.keep = set(cfg.get("keep", []))
        self.skip_ids = set(cfg.get("skip_ids", []))
        self.skip_classes = set(cfg.get("skip_classes", []))

    def translatable(self, t):
        t = norm(t)
        plain = norm(re.sub(r"<[^>]+>", " ", t))
        if not plain or plain in self.keep or t in self.keep:
            return False
        if not re.search(r"[A-Za-zÀ-ÿ]", plain):
            return False                                      # numbers, arrows, symbols
        if re.fullmatch(r"\S+@\S+\.\S+|https?://\S+|www\.\S+", plain):
            return False                                      # e-mail, web address
        if re.fullmatch(r"[+\d\s().…·–-]+", plain) or re.fullmatch(r"@[\w.]+", plain):
            return False                                      # phone numbers, @handles
        return True

    def skipped(self, n):
        for a in ancestors(n):
            if a.tag and (a.attr("translate") == "no" or a.attr("data-i18n-skip") is not None
                          or a.attr("data-lang") is not None or a.attr("id") in self.skip_ids
                          or self.skip_classes & set((a.attr("class") or "").split()) or a.tag in SKIP_TAGS):
                return True
        return False


# ---------------------------------------------------------------- the pages
def container(n):
    for a in ancestors(n):
        if a.tag in ("section", "footer", "header", "nav", "aside", "form") or (
                a.tag and "modal" in (a.attr("class") or "").split()):
            return a
    return None


def tagged_keys(n):
    out = []
    for a in ("data-i18n", "data-i18n-html"):
        if n.attr(a):
            out.append(n.attr(a))
    if n.attr("data-i18n-attr"):
        out += [p.split(":", 1)[1].strip() for p in n.attr("data-i18n-attr").split(";") if ":" in p]
    return out


def scan_page(rel, src, rules, page_name):
    """-> (entries: [(key, kind, pt_text)], untagged: [dict], warnings)"""
    root = parse(src)
    nodes = [n for n in walk(root) if n.tag]
    entries, untagged, warnings = [], [], []
    order = {id(n): i for i, n in enumerate(nodes)}

    def prefix_for(n):
        box = container(n)
        scope = [m for m in walk(box)] if box else nodes
        keyed = [(order[id(m)], k) for m in scope if m.tag for k in tagged_keys(m) if not k.startswith("meta.")]
        if keyed:
            here = order[id(n)]
            before = [x for x in keyed if x[0] <= here]
            k = (before[-1] if before else min(keyed, key=lambda x: x[0]))[1]
            return k.rsplit(".", 1)[0] if "." in k else k
        name = (box.attr("id") if box is not None else None) or (box.tag if box is not None else "page")
        return f"{page_name}.{slug(name, 3)}"

    covered = set()                                           # inside an element whose whole content has one key
    for n in nodes:
        if n.attr("data-i18n") is not None or n.attr("data-i18n-html") is not None:
            covered.update(id(d) for d in walk(n) if d is not n)
        skip = rules.skipped(n)                               # no new tags there, but existing ones still count
        # ---- already tagged: collect the Portuguese it carries
        if n.attr("data-i18n") is not None:
            if any(c.tag for c in n.children):
                warnings.append(f'{rel}: data-i18n="{n.attr("data-i18n")}" sits on an element with tags inside '
                                f'(switching language wipes them); use data-i18n-html there')
            entries.append((n.attr("data-i18n"), "text", norm(text_of(n))))
        if n.attr("data-i18n-html") is not None and n.end is not None:
            entries.append((n.attr("data-i18n-html"), "html", norm(src[n.sot_end:n.end])))
        done_attrs = set()
        if n.attr("data-i18n-attr"):
            for pair in n.attr("data-i18n-attr").split(";"):
                if ":" not in pair:
                    continue
                a, k = (x.strip() for x in pair.split(":", 1))
                done_attrs.add(a)
                if n.attr(a) is not None:
                    entries.append((k, "attr", norm(n.attr(a))))
        if skip or id(n) in covered:
            continue
        # ---- untagged attributes
        for a in ATTRS:
            v = n.attr(a)
            if v and a not in done_attrs and rules.translatable(v):
                untagged.append({"node": n, "kind": "attr", "attr": a, "text": norm(v), "prefix": prefix_for(n)})
        # ---- untagged text
        if n.attr("data-i18n") is not None or n.attr("data-i18n-html") is not None:
            continue
        texts = [c for c in n.children if c.tag is None and norm(c.text)]
        if not texts:
            continue
        elems = [c for c in n.children if c.tag]
        if not elems:
            t = norm(text_of(n))
            if rules.translatable(t):
                untagged.append({"node": n, "kind": "text", "text": t, "prefix": prefix_for(n)})
        elif all(c.tag in INLINE_MARKUP and not tagged_keys(c) for c in elems) and n.end is not None:
            inner = norm(src[n.sot_end:n.end])
            if rules.translatable(inner):
                untagged.append({"node": n, "kind": "html", "text": inner, "prefix": prefix_for(n)})
                covered.update(id(d) for d in walk(n) if d is not n)
        else:
            for c in texts:
                if rules.translatable(c.text):
                    untagged.append({"node": n, "kind": "wrap", "textnode": c, "text": norm(c.text),
                                     "prefix": prefix_for(n)})
    return entries, untagged, warnings


def apply_tags(src, items):
    """write the new keys into the HTML, from the end of the file backwards (positions stay valid)"""
    ops = []
    for it in items:
        n = it["node"]
        if it["kind"] == "wrap":
            c = it["textnode"]
            raw = src[c.start:c.end]
            lead, trail = raw[:len(raw) - len(raw.lstrip())], raw[len(raw.rstrip()):]
            ops.append((c.start, c.end, f'{lead}<span data-i18n="{it["key"]}">{raw.strip()}</span>{trail}'))
        else:
            ops.append((n.start, n.sot_end, it))
    merged = {}
    for s, e, what in ops:                                    # several new attributes on one start tag
        merged.setdefault((s, e), []).append(what)
    for (s, e), whats in sorted(merged.items(), key=lambda x: x[0][0], reverse=True):
        if isinstance(whats[0], str):
            src = src[:s] + whats[0] + src[e:]
            continue
        tag = src[s:e]
        attr_pairs = [f'{w["attr"]}:{w["key"]}' for w in whats if w["kind"] == "attr"]
        extra = [f'data-i18n="{w["key"]}"' for w in whats if w["kind"] == "text"]
        extra += [f'data-i18n-html="{w["key"]}"' for w in whats if w["kind"] == "html"]
        if attr_pairs:
            m = re.search(r'\sdata-i18n-attr="([^"]*)"', tag)
            if m:
                tag = tag[:m.start(1)] + m.group(1) + ";" + ";".join(attr_pairs) + tag[m.end(1):]
            else:
                extra.append(f'data-i18n-attr="{";".join(attr_pairs)}"')
        if extra:
            close = len(tag) - 2 if tag.endswith("/>") else len(tag) - 1
            sep = "" if tag[close - 1].isspace() else " "
            tag = tag[:close] + sep + " ".join(extra) + tag[close:]
        src = src[:s] + tag + src[e:]
    return src


# ---------------------------------------------------------------- the scripts
def strip_js_comments(js):
    """the script without comments and regular-expression literals (strings stay as they are)"""
    out, i, n, q = [], 0, len(js), None
    last = ""                                                 # last significant character outside strings
    while i < n:
        c = js[i]
        if q:
            out.append(c)
            if c == "\\":
                out.append(js[i + 1:i + 2])
                i += 2
                continue
            if c == q:
                q, last = None, c
        elif c in "\"'`":
            q = c
            out.append(c)
        elif js.startswith("//", i):
            j = js.find("\n", i)
            i = n if j < 0 else j
            continue
        elif js.startswith("/*", i):
            j = js.find("*/", i + 2)
            i = n if j < 0 else j + 2
            continue
        elif c == "/" and (last in "(,=:[!&|?{};+-*%<>~^" or re.search(r"\b(return|typeof|case)\s*$", "".join(out[-12:]))):
            j, cls = i + 1, False                             # a regular expression: skip it whole
            while j < n and (cls or js[j] != "/") and js[j] != "\n":
                if js[j] == "\\":
                    j += 1
                elif js[j] == "[":
                    cls = True
                elif js[j] == "]":
                    cls = False
                j += 1
            out.append("/re/")
            i, last = j + 1, "/"
            while i < n and js[i].isalpha():                  # flags
                i += 1
            continue
        else:
            out.append(c)
            if not c.isspace():
                last = c
        i += 1
    return "".join(out)


JS_STR = r'"(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\''


_ESC = {"n": "\n", "t": "\t", "r": "\r", "b": "\b", "f": "\f", "v": "\v", "0": "\0"}


def js_string(lit):
    """the value of a JavaScript string literal ("…" or '…')"""
    body, out, i = lit[1:-1], [], 0
    while i < len(body):
        c = body[i]
        if c == "\\" and i + 1 < len(body):
            n = body[i + 1]
            if n == "u" and re.match(r"[0-9a-fA-F]{4}", body[i + 2:i + 6]):
                out.append(chr(int(body[i + 2:i + 6], 16)))
                i += 6
                continue
            if n == "x" and re.match(r"[0-9a-fA-F]{2}", body[i + 2:i + 4]):
                out.append(chr(int(body[i + 2:i + 4], 16)))
                i += 4
                continue
            out.append(_ESC.get(n, "" if n == "\n" else n))
            i += 2
            continue
        out.append(c)
        i += 1
    return "".join(out)


def js_concat(expr):
    """ "a " + "b" → "a b" (only plain string literals joined with +) """
    parts = re.findall(JS_STR, expr)
    return "".join(js_string(p) for p in parts)


def scan_events(path, fields):
    """event id → {field: Portuguese} from js/events.js"""
    js = strip_js_comments(path.read_text(encoding="utf-8"))
    m = re.search(r"\bvar\s+EVENTS\s*=\s*\[(.*?)\n\s*\];", js, re.S)
    if not m:
        return {}, ["js/events.js: could not find the EVENTS list"]
    body, events, warnings = m.group(1), {}, []
    for block in re.split(r"(?=\bid\s*:)", body)[1:]:
        idm = re.match(r"id\s*:\s*(" + JS_STR + ")", block)
        if not idm:
            continue
        eid, ev = js_string(idm.group(1)), {}
        for f in fields:
            arr = re.search(r"\b" + f + r"\s*:\s*\[(.*?)\]", block, re.S)
            one = re.search(r"\b" + f + r"\s*:\s*((?:(?:" + JS_STR + r")\s*\+?\s*)+)", block)
            if arr and (not one or arr.start() <= one.start()):
                ev[f] = [js_string(x) for x in re.findall(JS_STR, arr.group(1))]
            elif one:
                ev[f] = js_concat(one.group(1))
        if eid in events:
            warnings.append(f"js/events.js: two events share the id {eid!r}")
        events[eid] = ev
    return events, warnings


def scan_script_calls(paths):
    """T("key", "Portuguese") / CastrosI18n.t("key", "Portuguese") with a literal fallback"""
    found, used = {}, set()
    for p in paths:
        js = strip_js_comments(p.read_text(encoding="utf-8"))
        for m in re.finditer(r"\b(?:T|t)\(\s*(" + JS_STR + r")\s*,\s*(" + JS_STR + r")\s*[,)]", js):
            k, v = js_string(m.group(1)), js_string(m.group(2))
            if re.fullmatch(r"[a-z0-9][\w.-]*\.[\w.-]+", k):
                found[k] = norm(v)
        for m in re.finditer(r"(" + JS_STR + r")", js):
            s = js_string(m.group(1))
            if re.fullmatch(r"[a-z][a-z0-9-]*(\.[a-z0-9][\w-]*)+\.?", s):
                used.add(s)
    return found, used


# ---------------------------------------------------------------- translation engines
SYSTEM_PROMPT = """You translate the website of {site} from European/Mozambican Portuguese into {english}.
Rules:
- Natural, professional, concise website English. Same meaning and tone; no additions, no omissions.
- Keep HTML tags exactly as they are (same tags, same attributes, same order); translate only the text between them.
- Keep placeholders like {{title}} or {{date}} exactly as written.
- Never translate these names: {keep}.
- Use these fixed translations: {glossary}.
- Arrays stay arrays with the same number of items.
Reply with one JSON object only: the same keys, each with its English value. No comments, no code fences."""


def _post(url, headers, body, timeout=90):
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"),
                                 headers={**headers, "content-type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:300]}") from None


def translate_claude(items, cfg, examples, model):
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        raise RuntimeError("set ANTHROPIC_API_KEY first")
    url = os.environ.get("I18N_ANTHROPIC_URL", "https://api.anthropic.com/v1/messages")
    system = SYSTEM_PROMPT.format(site=cfg["site_description"], english=cfg["english"],
                                  keep=", ".join(sorted(cfg.get("keep", []))) or "-",
                                  glossary="; ".join(f"{a} → {b}" for a, b in cfg.get("glossary", {}).items()) or "-")
    out, keys = {}, list(items)
    for i in range(0, len(keys), 40):
        batch = {k: items[k] for k in keys[i:i + 40]}
        ex = {k: v for k, v in examples.items() if any(k.rsplit(".", 1)[0] == b.rsplit(".", 1)[0] for b in batch)}
        ex = dict(list(ex.items())[:25]) or dict(list(examples.items())[:15])
        prompt = ("Existing translations on the site, for consistency (Portuguese → English):\n"
                  + json.dumps(ex, ensure_ascii=False, indent=1)
                  + "\n\nTranslate these:\n" + json.dumps(batch, ensure_ascii=False, indent=1))
        for attempt in (1, 2):
            res = _post(url, {"x-api-key": key, "anthropic-version": "2023-06-01"},
                        {"model": model, "max_tokens": 8000, "system": system,
                         "messages": [{"role": "user", "content": prompt}]})
            text = "".join(b.get("text", "") for b in res.get("content", []) if b.get("type") == "text")
            try:
                got = json.loads(text[text.index("{"):text.rindex("}") + 1])
                out.update({k: got[k] for k in batch if k in got})
                break
            except (ValueError, KeyError):
                if attempt == 2:
                    raise RuntimeError("Claude's reply was not the JSON asked for: " + text[:200])
    return out


def translate_deepl(items, cfg):
    key = os.environ.get("DEEPL_API_KEY")
    if not key:
        raise RuntimeError("set DEEPL_API_KEY first")
    base = os.environ.get("I18N_DEEPL_URL") or (
        "https://api-free.deepl.com" if key.endswith(":fx") else "https://api.deepl.com")
    keep = sorted(cfg.get("keep", []), key=len, reverse=True)
    keep_re = re.compile("|".join(r"(?<![\w>])" + re.escape(html.escape(t, quote=False)) + r"(?![\w<])" for t in keep)) \
        if keep else None
    glossary = cfg.get("glossary", {})

    def to_xml(s, is_html):
        s = s if is_html else html.escape(s, quote=False)
        s = re.sub(r"<(br|hr|img|wbr)(\s[^>]*)?\s*/?>", r"<\1\2/>", s)
        if keep_re:
            s = keep_re.sub(lambda m: "<keep>" + m.group(0) + "</keep>", s)      # one pass: no nesting
        return re.sub(r"\{(\w+)\}", r"<keep>{\1}</keep>", s)

    def from_xml(s, is_html):
        s = re.sub(r"</?keep>", "", s)
        s = re.sub(r"<(br|hr|wbr)\s*/>", r"<\1>", s)
        return s if is_html else html.unescape(s)

    flat = []                                                 # (key, index or None, text, is_html)
    out = {k: ([None] * len(v) if isinstance(v, list) else None) for k, v in items.items()}
    for k, v in items.items():
        for i, s in (enumerate(v) if isinstance(v, list) else [(None, v)]):
            if s in glossary:                                 # a fixed term on its own: no need to ask
                if i is None:
                    out[k] = glossary[s]
                else:
                    out[k][i] = glossary[s]
                continue
            flat.append((k, i, s, bool(re.search(r"<[a-z][^>]*>", s))))
    for i in range(0, len(flat), 50):
        chunk = flat[i:i + 50]
        res = _post(base + "/v2/translate", {"Authorization": "DeepL-Auth-Key " + key},
                    {"text": [to_xml(s, h) for _, _, s, h in chunk], "source_lang": "PT",
                     "target_lang": cfg.get("deepl_target", "EN-GB"), "tag_handling": "xml",
                     "ignore_tags": ["keep"], "context": cfg["site_description"]})
        for (k, idx, _, h), t in zip(chunk, res["translations"]):
            if idx is None:
                out[k] = from_xml(t["text"], h)
            else:
                out[k][idx] = from_xml(t["text"], h)
    return out


def problems(pt, en):
    """reasons an English value can't be used as is"""
    if isinstance(pt, list):
        if not isinstance(en, list) or len(en) != len(pt):
            return ["must be a list with the same number of items"]
        return [p for a, b in zip(pt, en) for p in problems(a, b)]
    if not isinstance(en, str) or not en.strip():
        return ["empty"]
    errs = []
    if sorted(re.findall(r"\{\w+\}", pt)) != sorted(re.findall(r"\{\w+\}", en)):
        errs.append("placeholders {…} differ")
    tags = lambda s: sorted(re.findall(r"</?([a-zA-Z][\w-]*)", s))
    if tags(pt) != tags(en):
        errs.append("HTML tags differ")
    return errs


# ---------------------------------------------------------------- main
def load_json(path, default):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def dump_json(data):
    return json.dumps(data, indent=2, ensure_ascii=False)        # same format as tools/seo.py writes


def insert_near(d, key, value):
    """add a key right after the last key with the same prefix (tidier diffs)"""
    if key in d:
        d[key] = value
        return d
    pre, items, at = key.rsplit(".", 1)[0] + ".", list(d.items()), None
    for i, (k, _) in enumerate(items):
        if k.startswith(pre):
            at = i
    if at is None:
        items.append((key, value))
    else:
        items.insert(at + 1, (key, value))
    return dict(items)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--dry-run", action="store_true", help="report only; change nothing")
    ap.add_argument("--check", action="store_true", help="change nothing; exit 1 if anything is missing or outdated")
    ap.add_argument("--export", metavar="FILE", help="write what needs English to FILE")
    ap.add_argument("--import", dest="import_", metavar="FILE", help="read English from FILE and save it")
    ap.add_argument("--engine", choices=["auto", "claude", "deepl", "none"], default=None)
    ap.add_argument("--model", default=None, help="Claude model ID (default from the config)")
    ap.add_argument("--retranslate", nargs="+", metavar="KEY", default=[], help="make these keys' English again")
    ap.add_argument("--prune", action="store_true", help="also delete keys no page or script uses any more")
    args = ap.parse_args()
    read_only = args.dry_run or args.check
    saving = not read_only and not args.export

    cfg = load_json(CONFIG, {})
    rules = Rules(cfg)
    tr_path = ROOT / cfg.get("translations", "js/translations.json")
    src_path = ROOT / cfg.get("sources", "tools/i18n-sources.json")
    raw_tr = tr_path.read_text(encoding="utf-8")
    data = json.loads(raw_tr)
    sources = load_json(src_path, {})
    pt_ref, en = data["pt"], data["en"]

    # ---- 1. the pages: tag new text, collect every key's Portuguese
    want, where, report, warnings, new_html = {}, {}, {"tagged": [], "changed": [], "new": [], "removed": []}, [], {}
    reuse, taken = {}, set(pt_ref) | set(en)       # the same text in the same part of the site → the same key
    for k, v in pt_ref.items():
        if isinstance(v, str):
            reuse.setdefault((k.rsplit(".", 1)[0], norm(v)), k)
    for rel in cfg["pages"]:
        path = ROOT / rel
        src = path.read_text(encoding="utf-8")
        page_name = pathlib.Path(rel).stem
        entries, untagged, w = scan_page(rel, src, rules, page_name)
        warnings += w
        taken |= {k for k, _, _ in entries}
        for k, _, t in entries:
            reuse.setdefault((k.rsplit(".", 1)[0], t), k)
        for it in untagged:
            k = reuse.get((it["prefix"], it["text"]))
            if not k:
                base = f'{it["prefix"]}.{slug(it["text"])}'
                k, i = base, 2
                while k in taken:
                    k, i = f"{base}-{i}", i + 1
                taken.add(k)
                reuse[(it["prefix"], it["text"])] = k
            it["key"] = k
            entries.append((k, it["kind"] if it["kind"] != "wrap" else "text", it["text"]))
            report["tagged"].append(f'{rel}: {k} = "{it["text"][:70]}"')
        if untagged:
            new_html[path] = apply_tags(src, untagged)
        for k, kind, t in entries:
            if k.startswith("meta."):
                continue                                      # tools/seo.py owns these
            if k in want and want[k] != t:
                warnings.append(f'key {k} has different Portuguese on {where[k]} and {rel}: '
                                f'"{want[k][:50]}" vs "{t[:50]}" (give one of them its own key)')
                continue
            want[k], where[k] = t, rel

    # ---- 2. the scripts: T("key", "Portuguese")
    js_paths = sorted((ROOT / "js").glob("*.js"))
    calls, used_in_js = scan_script_calls(js_paths)
    for k, v in calls.items():
        if k not in want and rules.translatable(v):
            want[k], where[k] = v, "a script"

    # ---- 3. the events (Portuguese reference kept in tools/i18n-sources.json)
    ev_file = ROOT / cfg.get("events_file", "js/events.js")
    events, w = scan_events(ev_file, cfg.get("event_fields", [])) if ev_file.exists() else ({}, [])
    warnings += w
    ev_want = {}
    for eid, fields in events.items():
        for f, v in fields.items():
            if isinstance(v, list):
                v = [norm(x) for x in v]
                if not any(rules.translatable(x) for x in v):
                    continue
            elif not rules.translatable(v):
                continue
            else:
                v = norm(v)
            ev_want[f"events.item.{eid}.{f}"] = v

    # ---- 4. what needs English
    pending = {}
    for k, v in list(want.items()) + list(ev_want.items()):
        ref = sources.get(k) if k in ev_want else pt_ref.get(k)
        refn = [norm(x) for x in ref] if isinstance(ref, list) else (norm(ref) if isinstance(ref, str) else ref)
        if k not in en:
            pending[k] = v
            report["new"].append(k)
        elif k in args.retranslate:
            pending[k] = v
            report["changed"].append(f"{k} (asked to redo)")
        elif refn is not None and refn != v:
            pending[k] = v
            report["changed"].append(f'{k}: "{str(refn)[:60]}" → "{str(v)[:60]}"')

    # English of events that are gone
    gone = [k for k in en if k.startswith("events.item.") and k.split(".")[2] not in events]
    report["removed"] = gone

    unused = sorted(k for k in en if not k.startswith(("meta.", "events.item."))
                    and k not in want and k not in used_in_js
                    and not any(k.startswith(p) for p in used_in_js if p.endswith(".")))

    # ---- 5. translate
    translated = {}
    if args.import_:
        filled = load_json(pathlib.Path(args.import_), {})
        for k, v in filled.items():
            if isinstance(v, dict) and k in pending:
                if v.get("pt") is not None and (norm(v["pt"]) if isinstance(v["pt"], str) else v["pt"]) != pending[k]:
                    warnings.append(f"{k}: the Portuguese changed since the export; skipped")
                elif v.get("en"):
                    translated[k] = v["en"]
    # the same Portuguese already translated elsewhere on the site (or a glossary term): reuse that English
    memory = {}
    for k, v in en.items():
        ref = sources.get(k) if k.startswith("events.item.") else pt_ref.get(k)
        if ref is not None and not k.startswith("meta.") and k not in pending:
            ref = json.dumps([norm(x) for x in ref] if isinstance(ref, list) else norm(ref), ensure_ascii=False)
            memory.setdefault(ref, []).append((k, v))
    reused = []
    for k, v in pending.items():
        if k in translated:
            continue
        if isinstance(v, str) and v in cfg.get("glossary", {}):
            translated[k] = cfg["glossary"][v]
            reused.append(f"{k}: glossary")
            continue
        hits = memory.get(json.dumps(v, ensure_ascii=False), [])
        same_part = [h for h in hits if h[0].rsplit(".", 1)[0] == k.rsplit(".", 1)[0]]
        options = {json.dumps(h[1], ensure_ascii=False) for h in (same_part or hits)}
        if len(options) == 1:                                 # one clear answer, not two competing ones
            translated[k] = (same_part or hits)[0][1]
            reused.append(f"{k}: same as {(same_part or hits)[0][0]}")
    engine = args.engine or cfg.get("engine", "auto")
    if engine == "auto":
        engine = "claude" if os.environ.get("ANTHROPIC_API_KEY") else "deepl" if os.environ.get("DEEPL_API_KEY") else "none"
    todo = {k: v for k, v in pending.items() if k not in translated}
    if todo and not read_only and not args.export and engine != "none":
        # the site's existing translations, so new English matches the old (key → "Portuguese → English")
        examples = {k: f"{pt_ref[k]} → {en[k]}" for k in pt_ref if k in en and not k.startswith("meta.")
                    and isinstance(pt_ref[k], str) and isinstance(en[k], str) and k not in todo}
        try:
            if engine == "claude":
                got = translate_claude(todo, cfg, examples, args.model or cfg.get("claude_model", "claude-haiku-5-5"))
            else:
                got = translate_deepl(todo, cfg)
            translated.update({k: v for k, v in got.items() if v is not None})
        except (RuntimeError, OSError) as e:
            warnings.append(f"{engine}: {e}")
    bad = {}
    for k, v in list(translated.items()):
        errs = problems(pending[k], v)
        if errs:
            bad[k] = errs
            del translated[k]
    still = {k: v for k, v in pending.items() if k not in translated}

    # ---- 6. export
    if args.export:
        blank = lambda v: [""] * len(v) if isinstance(v, list) else ""
        out = {}
        for k, v in pending.items():
            if k in translated:
                continue
            out[k] = {"where": "js/events.js" if k in ev_want else where.get(k, "?"), "pt": v, "en": blank(v)}
            if k in en:
                out[k]["old_en"] = en[k]                      # the English of the previous Portuguese, as a start
        pathlib.Path(args.export).write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # ---- 7. save
    if not read_only and not args.export:
        for path, s in new_html.items():
            path.write_text(s, encoding="utf-8")
        for k, v in translated.items():
            data["en"] = insert_near(data["en"], k, v)
            if k in ev_want:
                sources[k] = ev_want[k]
            else:
                data["pt"] = insert_near(data["pt"], k, want[k])
        for k, v in ev_want.items():                          # first run: record what the English was made from
            if k in data["en"] and k not in sources and k not in pending:
                sources[k] = v
        for k, v in want.items():
            if k in data["en"] and k not in data["pt"] and k not in pending:
                data["pt"] = insert_near(data["pt"], k, v)
        for k in gone + (unused if args.prune else []):
            data["en"].pop(k, None)
            data["pt"].pop(k, None)
            sources.pop(k, None)
        for k in [k for k in sources if k not in ev_want]:
            sources.pop(k)
        new_raw = dump_json(data)
        if new_raw != raw_tr:
            tr_path.write_text(new_raw, encoding="utf-8")
        if sources or src_path.exists():
            src_path.write_text(json.dumps(dict(sorted(sources.items())), indent=2, ensure_ascii=False) + "\n",
                                encoding="utf-8")

    # ---- 8. report
    def section(title, rows, limit=40):
        if rows:
            print(f"\n{title} ({len(rows)}):")
            for r in rows[:limit]:
                print("  - " + r)
            if len(rows) > limit:
                print(f"  … and {len(rows) - limit} more")

    verb = "would be " if read_only else ""
    section(f"New Portuguese text {verb}tagged in the HTML", report["tagged"])
    section("Needs English (new)", report["new"])
    section("Portuguese changed, English redone" if not read_only else "Portuguese changed, English out of date",
            report["changed"])
    section(f"English of events no longer in js/events.js {verb}removed", report["removed"])
    section("English reused (same Portuguese elsewhere on the site, or the glossary)", reused)
    if translated:
        section("English saved now" if saving else "English ready (not saved in this mode)", [f'{k}: {str(translated[k])[:80]}' for k in translated])
    section("Could not use the translation", [f"{k}: {', '.join(e)}" for k, e in bad.items()])
    section("Still without English" + ("" if read_only or args.export else f" (engine: {engine})"),
            [f'{k} ({where.get(k, "js/events.js")}): "{str(v)[:60]}"' for k, v in still.items()])
    section("Keys no page or script uses any more" + (f" ({verb}deleted)" if args.prune else
            " (left in place; --prune deletes them)"), unused, 15)
    section("Warnings", warnings)
    if args.export:
        print(f"\nWrote {len(still)} item(s) to {args.export}: fill in each \"en\", then run with --import {args.export}")
    elif still and engine == "none" and not read_only:
        print("\nNo translation key set (ANTHROPIC_API_KEY or DEEPL_API_KEY). "
              "Use --export FILE to translate these by hand, then --import FILE.")
    total = len(report["tagged"]) + len(pending) + len(gone)
    print(f"\n{'OK: everything has up-to-date English.' if not total and not warnings else 'Done.'}"
          if not args.check else "")
    if args.check:
        print("i18n check:", "OK" if not (report["tagged"] or pending) else
              f"{len(report['tagged'])} untagged, {len(pending)} without up-to-date English")
        return 1 if (report["tagged"] or pending) else 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
